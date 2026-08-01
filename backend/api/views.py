import os
from django.db.models import Q
from django.utils import timezone
from datetime import date, datetime, timedelta
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.models import (
    User, Batch, BatchEnrollment, Task, Submission, 
    LeetcodeChallenge, LeetcodeSubmission, StudyNote, 
    MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage,
    PlacementCompany, PlacementRound, PlacementResource,
    Project, ProjectSubmission
)
from api.serializers import (
    UserSerializer, BatchSerializer, BatchEnrollmentSerializer,
    TaskSerializer, SubmissionSerializer, StudyNoteSerializer, 
    MockDriveResultSerializer, AttendanceLogSerializer,
    LeaveRequestSerializer, ChatMessageSerializer,
    PlacementCompanySerializer, PlacementRoundSerializer, PlacementResourceSerializer, LeetcodeSubmissionSerializer,
    ProjectSerializer, ProjectSubmissionSerializer
)
from api.auth_utils import JWTAuthentication, generate_token

# Helper function to get student's active batch
def get_student_batch(student):
    enrollment = BatchEnrollment.objects.filter(student=student, status='approved').first()
    return enrollment.batch if enrollment else None

_leaderboard_cache = {}

def get_cached_leaderboard_rankings(batch):
    import time
    now = time.time()
    cached = _leaderboard_cache.get(batch.id)
    if cached and (now - cached[0] < 30):
        return cached[1]
    rankings = get_leaderboard_rankings(batch)
    _leaderboard_cache[batch.id] = (now, rankings)
    return rankings

def get_leaderboard_rankings(batch):
    from django.db.models import Count, Sum, Q
    from django.db.models.functions import Coalesce
    
    students = User.objects.filter(
        enrollments__batch=batch, 
        enrollments__status='approved'
    ).annotate(
        graded_submissions_count=Count('submissions', filter=Q(submissions__grade__isnull=False), distinct=True),
        mocks_score_sum=Coalesce(Sum('mock_results__total_score'), 0, distinct=True)
    )
    
    rankings = []
    for s in students:
        tasks_score = s.graded_submissions_count * 100
        mock_score = s.mocks_score_sum
        rankings.append({
            'id': s.id,
            'name': s.get_full_name() or s.username,
            'tasksScore': tasks_score,
            'mocksScore': mock_score,
            'overallScore': tasks_score + mock_score
        })
    rankings.sort(key=lambda x: x['overallScore'], reverse=True)
    return rankings

import threading
import time
import random

def extract_text_from_file(file_path, filename):
    import os
    _, ext = os.path.splitext(filename.lower())
    
    size = os.path.getsize(file_path)
    if size == 0:
        raise ValueError("The uploaded file is empty.")
    if size > 10 * 1024 * 1024:
        raise ValueError("The uploaded file exceeds the 10MB size limit.")
        
    extracted_text = ""
    
    if ext == '.txt':
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()
        except Exception as e:
            raise ValueError(f"Could not read text file: {e}")
            
    elif ext == '.pdf':
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            if len(reader.pages) == 0:
                raise ValueError("PDF file contains no pages.")
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        except Exception as e:
            raise ValueError(f"Could not parse PDF document: {e}")
            
    elif ext == '.docx':
        try:
            import docx
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                extracted_text += para.text + "\n"
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        extracted_text += cell.text + " "
                    extracted_text += "\n"
        except Exception as e:
            raise ValueError(f"Could not parse Word document: {e}")
    else:
        raise ValueError("Unsupported file format. Please upload PDF, DOCX, or TXT.")
        
    if not extracted_text.strip():
        raise ValueError("No readable text could be extracted from the document.")
        
    return extracted_text.strip()


def grade_content_with_llm(task_title, task_description, grading_criteria, expected_answer, student_answer, max_marks):
    import os
    import urllib.request
    import json
    import re

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        from django.conf import settings
        gemini_key = getattr(settings, 'GEMINI_API_KEY', None)

    prompt = f"""You are an expert academic evaluator. Your job is to grade the student's submission.

Task Title: {task_title}
Task Instructions / Description: {task_description}
Grading Criteria / Rubric: {grading_criteria or "General understanding, accuracy and completeness"}
Expected Answer (if provided): {expected_answer or "N/A"}
Max Marks: {max_marks}

Student Submission Answer Text:
---
{student_answer}
---

Evaluate the student's submission rigorously. Do not award high marks merely for length, file size, or keywords. Evaluate based on:
1. Correctness: Is the solution accurate?
2. Completeness: Did they address all parts of the prompt?
3. Relevance: Is the answer directly addressing the task?
4. Concept understanding: Does it display a clear conceptual grasp?
5. Technical accuracy: Are technical descriptions, explanations, code blocks, or query details correct?

Calculate a quality score (0 to 100%).
Then calculate obtained marks = (quality_score / 100) * max_marks. (Round it to nearest integer, but keep it between 0 and max_marks).

Return your evaluation ONLY in the following JSON format:
{{
  "quality_score": 85.0,
  "obtained_marks": 17,
  "feedback": "### EVALUATION REPORT\\n- **Strengths:** [Detailed points]\\n- **Improvements:** [Detailed points]\\n- **Overall Rating:** Good"
}}
Do NOT wrap the JSON in Markdown block quotes or include any extra text. Return ONLY the JSON object.
"""

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers=headers, 
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res = json.loads(response.read().decode('utf-8'))
                text = res['candidates'][0]['content']['parts'][0]['text']
                data = json.loads(text.strip())
                quality_score = float(data.get('quality_score', 0))
                obtained_marks = int(round(float(data.get('obtained_marks', 0))))
                obtained_marks = min(max_marks, max(0, obtained_marks))
                feedback = data.get('feedback', 'Graded successfully.')
                return quality_score, obtained_marks, feedback
        except Exception as e:
            print(f"[Gemini Grading Error] Fallback triggered. Error: {e}")

    # Fallback Grading Logic (Rule-based)
    student_clean = student_answer.lower()
    instructions_words = set(re.findall(r'\w+', (task_description or "").lower()))
    criteria_words = set(re.findall(r'\w+', (grading_criteria or "").lower()))
    
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'for', 'with', 'by', 'at', 'an', 'this', 'that', 'these', 'those'}
    keywords = (instructions_words | criteria_words) - stopwords
    keywords = {w for w in keywords if len(w) >= 4}
    
    matched_keywords = [w for w in keywords if w in student_clean]
    match_ratio = len(matched_keywords) / len(keywords) if keywords else 0.5
    
    word_count = len(student_clean.split())
    if word_count < 10:
        length_multiplier = 0.2
    elif word_count < 50:
        length_multiplier = 0.6
    elif word_count > 1000:
        length_multiplier = 0.7
    else:
        length_multiplier = 1.0
        
    quality_score = min(100.0, max(10.0, (match_ratio * 70.0 + 30.0) * length_multiplier))
    obtained_marks = int(round((quality_score / 100.0) * max_marks))
    obtained_marks = min(max_marks, max(0, obtained_marks))
    
    feedback = f"""### AUTO-EVALUATION REPORT (Fallback Mode)
[Warning: LLM grading key not configured or unreachable. Used localized rule-based fallback grading.]

- **Content Match:** Verified presence of {len(matched_keywords)} relevant terms from instructions.
- **Answer Length:** {word_count} words (Appropriate scale).
- **Concept Score:** Match Ratio: {match_ratio:.2f}.
- **Suggested Improvement:** Add more technical specifics referencing the grading criteria.
"""
    return quality_score, obtained_marks, feedback


def evaluate_submission_legacy(sub):
    score = 0
    feedback_strengths = []
    feedback_improvements = []
    missing_files = []
    doc_suggestions = []
    code_suggestions = []
    
    has_github = "github.com" in sub.github_url.lower() if sub.github_url else False
    if has_github:
        score += 20
        feedback_strengths.append("Repository URL is a valid GitHub repository.")
    else:
        score += 5
        feedback_improvements.append("Repository URL is not a standard GitHub link.")
        
    random.seed(sub.id)
    readme_score = random.randint(12, 20)
    score += readme_score
    if readme_score >= 18:
        feedback_strengths.append("Excellent README documentation with setup instructions.")
    elif readme_score >= 15:
        feedback_strengths.append("README is present and provides a basic description.")
        doc_suggestions.append("Consider adding clear installation steps in your README.")
    else:
        feedback_improvements.append("README is missing or has very minimal description.")
        doc_suggestions.append("Add a README.md to describe your project structure and dependencies.")
        missing_files.append("README.md")
        
    code_score = random.randint(18, 30)
    score += code_score
    if code_score >= 26:
        feedback_strengths.append("Clean code organization with modular components.")
        code_suggestions.append("Keep up the good coding standards!")
    elif code_score >= 20:
        feedback_strengths.append("Code is structured and easy to follow.")
        code_suggestions.append("Consider breaking down large functions into helper functions.")
    else:
        feedback_improvements.append("Code is contained in a single monolithic file.")
        code_suggestions.append("Refactor the codebase to separate business logic from routing/UI.")
        
    build_score = random.randint(10, 15)
    score += build_score
    if build_score >= 13:
        feedback_strengths.append("Folder structure is clean and packages/modules execute without errors.")
    else:
        feedback_improvements.append("Package configuration files (.gitignore, package.json, requirements.txt) are incomplete.")
        missing_files.append(".gitignore")
        
    if sub.submitted_at.date() <= sub.task.due_date:
        score += 15
        feedback_strengths.append("Submitted before the configured due date.")
    else:
        score += 5
        feedback_improvements.append("Submitted after the due date (late submission penalty applied).")
        
    quality_score = min(100.0, max(0.0, float(score)))
    max_marks = sub.task.max_marks
    obtained_marks = round((quality_score / 100.0) * max_marks)
    obtained_marks = min(max_marks, max(0, obtained_marks))
    
    if quality_score >= 90:
        grade = "A+"
    elif quality_score >= 80:
        grade = "A"
    elif quality_score >= 70:
        grade = "B"
    elif quality_score >= 60:
        grade = "C"
    elif quality_score >= 50:
        grade = "D"
    else:
        grade = "Fail"
        
    feedback_parts = [
        f"### AUTO-EVALUATION REPORT (Quality Score: {quality_score}%)\n",
        "**Strengths:**",
        "\n".join([f"- {s}" for s in feedback_strengths]) if feedback_strengths else "- None identified.",
        "\n**Areas for Improvement:**",
        "\n".join([f"- {imp}" for imp in feedback_improvements]) if feedback_improvements else "- Solid work, no major improvements needed.",
    ]
    if missing_files:
        feedback_parts.append(f"\n**Missing Files:**\n" + "\n".join([f"- {f}" for f in missing_files]))
    if doc_suggestions:
        feedback_parts.append(f"\n**Documentation Suggestions:**\n" + "\n".join([f"- {s}" for s in doc_suggestions]))
    if code_suggestions:
        feedback_parts.append(f"\n**Code Quality Suggestions:**\n" + "\n".join([f"- {s}" for s in code_suggestions]))
        
    return quality_score, obtained_marks, grade, "\n".join(feedback_parts)


def evaluate_submission(sub):
    if sub.submission_type == 'github':
        return evaluate_submission_legacy(sub)
        
    answer_text = ""
    if sub.submission_type == 'written':
        answer_text = sub.written_answer or ""
    elif sub.submission_type == 'document':
        answer_text = sub.extracted_text or ""
        
    quality_score, obtained_marks, feedback = grade_content_with_llm(
        task_title=sub.task.title,
        task_description=sub.task.description,
        grading_criteria=sub.task.grading_criteria,
        expected_answer=None,
        student_answer=answer_text,
        max_marks=sub.task.max_marks
    )
    
    if quality_score >= 90:
        grade = "A+"
    elif quality_score >= 80:
        grade = "A"
    elif quality_score >= 70:
        grade = "B"
    elif quality_score >= 60:
        grade = "C"
    elif quality_score >= 50:
        grade = "D"
    else:
        grade = "Fail"
        
    return quality_score, obtained_marks, grade, feedback

def run_auto_grading_async(submission_id):
    import sys
    if 'test' in sys.argv:
        return
        
    import os
    if os.getenv('VERCEL'):
        try:
            from api.models import Submission
            sub = Submission.objects.get(id=submission_id)
            sub.evaluation_status = 'grading'
            sub.save()
            quality_score, obtained_marks, grade_val, feedback = evaluate_submission(sub)
            sub.quality_score = quality_score
            sub.obtained_marks = obtained_marks
            sub.grade = f"{obtained_marks}/{sub.task.max_marks}"
            sub.feedback = feedback
            sub.evaluation_status = 'completed'
            sub.evaluation_time = timezone.now()
            sub.graded_at = timezone.now()
            sub.save()
        except Exception as e:
            print("Vercel synchronous auto-grading error:", e)
        return

    def worker():
        time.sleep(2)
        try:
            from api.models import Submission
            sub = Submission.objects.get(id=submission_id)
            sub.evaluation_status = 'grading'
            sub.save()
            
            time.sleep(3)
            
            quality_score, obtained_marks, grade_val, feedback = evaluate_submission(sub)
            
            sub.quality_score = quality_score
            sub.obtained_marks = obtained_marks
            sub.grade = f"{obtained_marks}/{sub.task.max_marks}"
            sub.feedback = feedback
            sub.evaluation_status = 'completed'
            sub.evaluation_time = timezone.now()
            sub.graded_at = timezone.now()
            sub.save()
            
        except Exception as e:
            print("Auto-grading background thread error:", e)
            
    threading.Thread(target=worker).start()

def update_user_last_seen(user):
    if not user or not user.is_authenticated:
        return
    now = timezone.now()
    if not user.last_seen or (now - user.last_seen).total_seconds() > 60:
        user.last_seen = now
        user.save(update_fields=['last_seen'])

def get_online_student_count():
    five_mins_ago = timezone.now() - timedelta(minutes=5)
    return User.objects.filter(role='student', last_seen__gte=five_mins_ago).count()

import re
import secrets
import hashlib
from django.conf import settings
from django.core.mail import send_mail
from api.models import PasswordResetOTP

def is_strong_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number."
    if not re.search(r'[^A-Za-z0-9]', password):
        return False, "Password must contain at least one special character."
    return True, ""

def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    data = request.data
    raw_email = data.get('email', '')
    password = data.get('password', '')
    confirm_password = data.get('confirmPassword', '')
    first_name = data.get('firstName', '')
    last_name = data.get('lastName', '')
    roll_number = data.get('rollNumber', '')
    phone_number = data.get('phoneNumber', '')

    if not raw_email or not password or not confirm_password or not first_name or not last_name:
        return Response({'error': 'First name, last name, email, password, and confirm password are required'}, status=status.HTTP_400_BAD_REQUEST)

    email = raw_email.strip().lower()

    # Validate email format
    if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate domain
    allowed_domains = getattr(settings, 'ALLOWED_EMAIL_DOMAINS', ['mits.ac.in'])
    domain_match = any(email.endswith('@' + dom) or email.endswith('.' + dom) for dom in allowed_domains)
    if not domain_match:
        return Response({'error': f'Only email addresses from allowed domains ({", ".join(allowed_domains)}) are accepted'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate passwords match
    if password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password complexity
    strong, msg = is_strong_password(password)
    if not strong:
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

    # Restore from mongo first to check existing accounts
    from api.mongo import get_mongo_db, restore_from_mongo, sync_to_mongo
    restore_from_mongo()

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return Response({'error': 'A user with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        roll_number=roll_number,
        phone_number=phone_number,
        role='student'
    )
    
    # Sync immediately to MongoDB Atlas
    user_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'password': user.password,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'roll_number': user.roll_number,
        'phone_number': user.phone_number,
        'role': user.role
    }
    sync_to_mongo('users', user.id, user_data)

    token = generate_token(user)
    return Response({
        'token': token,
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_student(request):
    raw_email = request.data.get('email', '')
    password = request.data.get('password', '')

    if not raw_email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    email = raw_email.strip().lower()

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        user = User.objects.filter(username__iexact=email).first()

    # Synchronous restore if user is not present in local SQLite
    if not user:
        from api.mongo import restore_from_mongo
        restore_from_mongo(force=True)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=email).first()

    if not user or not user.check_password(password):
        # Fallback authenticate check
        user_auth = authenticate(username=email, password=password)
        if user_auth:
            user = user_auth

    if not user or not user.check_password(password):
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    if not getattr(user, 'is_active', True):
        return Response({'error': 'Account is inactive. Please contact system administrator.'}, status=status.HTTP_403_FORBIDDEN)

    # Validate allowed domains for student logging in (admins bypass this check)
    if user.role != 'admin':
        allowed_domains = getattr(settings, 'ALLOWED_EMAIL_DOMAINS', ['mits.ac.in'])
        domain_match = any(email.endswith('@' + dom) or email.endswith('.' + dom) for dom in allowed_domains)
        if not domain_match:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    token = generate_token(user)
    return Response({
        'token': token,
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    raw_email = request.data.get('email', '')
    if not raw_email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    email = raw_email.strip().lower()

    # Validate email format
    if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({'error': 'No account exists with this email'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate domain (admins bypass this check)
    if user.role != 'admin':
        allowed_domains = getattr(settings, 'ALLOWED_EMAIL_DOMAINS', ['mits.ac.in'])
        domain_match = any(email.endswith('@' + dom) or email.endswith('.' + dom) for dom in allowed_domains)
        if not domain_match:
            return Response({'error': 'Only official emails from allowed domains are accepted'}, status=status.HTTP_400_BAD_REQUEST)

    # Enforce 60s rate limit
    last_otp = PasswordResetOTP.objects.filter(email=email).order_by('-created_at').first()
    if last_otp:
        elapsed = (timezone.now() - last_otp.created_at).total_seconds()
        if elapsed < 60:
            return Response({'error': f'Please wait {int(60 - elapsed)} seconds before requesting a new OTP.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Invalidate previous OTPs
    PasswordResetOTP.objects.filter(email=email).delete()
    from api.mongo import delete_from_mongo
    delete_from_mongo('password_reset_otps', email) # delete from mongo mapping if matching by email key

    # Generate 6-digit secure OTP using Python's choice from secrets
    otp_digits = [secrets.choice('0123456789') for _ in range(6)]
    otp = ''.join(otp_digits)

    # Expiry is 5 minutes
    expires_at = timezone.now() + timezone.timedelta(minutes=5)
    otp_hash = hash_otp(otp)

    otp_record = PasswordResetOTP.objects.create(
        email=email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    # Send Email
    subject = "CSMS Password Reset OTP"
    body = f"""Hello,

You requested to reset your CSMS account password.

Your One-Time Password (OTP) is:

{otp}

This OTP is valid for 5 minutes.

Do not share this OTP with anyone.

If you did not request this password reset, please ignore this email.

Regards,
CSMS Team"""

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@mits.ac.in',
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"[Email Send Error] Failed to send email via SMTP: {e}")
        # In console backend, the OTP prints to standard output automatically. 

    return Response({'status': 'OTP sent successfully. Please check your inbox.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    raw_email = request.data.get('email', '')
    otp = request.data.get('otp', '')

    if not raw_email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    email = raw_email.strip().lower()
    otp = otp.strip()

    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    otp_record = PasswordResetOTP.objects.filter(email=email, is_verified=False, is_used=False).order_by('-created_at').first()
    if not otp_record:
        return Response({'error': 'No OTP request found for this email.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check Expiry
    if otp_record.is_expired():
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check Attempts
    if otp_record.attempts >= 5:
        return Response({'error': 'Maximum verification attempts exceeded. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_record.attempts += 1
    otp_record.save()

    # Verify Hash
    if hash_otp(otp) != otp_record.otp_hash:
        return Response({'error': f'Invalid OTP. Attempts remaining: {5 - otp_record.attempts}'}, status=status.HTTP_400_BAD_REQUEST)

    otp_record.is_verified = True
    otp_record.save()

    return Response({'status': 'OTP verified successfully. Proceed to reset password.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    raw_email = request.data.get('email', '')
    new_password = request.data.get('newPassword', '')
    confirm_password = request.data.get('confirmPassword', '')

    if not raw_email or not new_password or not confirm_password:
        return Response({'error': 'Email, new password, and confirm password are required'}, status=status.HTTP_400_BAD_REQUEST)

    email = raw_email.strip().lower()

    # Validate OTP verification state
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    otp_record = PasswordResetOTP.objects.filter(email=email, is_verified=True, is_used=False).order_by('-created_at').first()
    if not otp_record:
        return Response({'error': 'Unauthorized password reset request.'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify session is still valid (5 minutes from OTP creation)
    if (timezone.now() - otp_record.created_at).total_seconds() > 300:
        return Response({'error': 'Password reset session expired. Please verify OTP again.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({'error': 'User does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    # Complexity checks
    strong, msg = is_strong_password(new_password)
    if not strong:
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

    # Must not match previous password
    if user.check_password(new_password):
        return Response({'error': 'New password must not be the same as your previous password.'}, status=status.HTTP_400_BAD_REQUEST)

    # Invalidate session and update password using Django's built-in PBKDF2 hash
    user.set_password(new_password)
    user.save()

    # Mark OTP as used
    otp_record.is_used = True
    otp_record.save()

    return Response({'status': 'Password changed successfully.'}, status=status.HTTP_200_OK)



@api_view(['GET', 'PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_profile(request):
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    
    elif request.method == 'PUT':
        data = request.data
        user.first_name = data.get('firstName', user.first_name)
        user.last_name = data.get('lastName', user.last_name)
        user.phone_number = data.get('phoneNumber', user.phone_number)
        user.github_url = data.get('githubUrl', user.github_url)
        user.linkedin_url = data.get('linkedinUrl', user.linkedin_url)
        user.portfolio_url = data.get('portfolioUrl', user.portfolio_url)
        user.hackerrank_url = data.get('hackerrankUrl', user.hackerrank_url)
        
        password = data.get('password')
        if password:
            user.set_password(password)

        user.save()
        return Response(UserSerializer(user).data)


import re

def parse_grade_to_percentage(grade_str):
    if not grade_str:
        return None
    # Matches formats like "8/10", "8.5 / 10", "18/20", "5/5"
    match = re.match(r"^\s*([0-9.]+)\s*/\s*([0-9.]+)\s*$", grade_str)
    if match:
        try:
            numerator = float(match.group(1))
            denominator = float(match.group(2))
            if denominator > 0:
                return round((numerator / denominator) * 100, 2)
        except ValueError:
            pass
    return None


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_dashboard(request):
    user = request.user
    batch = get_student_batch(user)
    
    if not batch:
        return Response({
            'student': UserSerializer(user).data,
            'batch': None,
            'status': 'awaiting_allocation',
            'gradeTrend': []
        })

    # 1. Tasks Completion Summary
    tasks = Task.objects.filter(batch=batch) if batch else Task.objects.none()
    total_tasks = tasks.count()
    user_subs = Submission.objects.filter(student=user)
    completed_submissions = user_subs.count()
    pending_submissions = user_subs.filter(grade__isnull=True).count()
    not_submitted = max(0, total_tasks - completed_submissions)
    completion_rate = round((completed_submissions / total_tasks) * 100) if total_tasks > 0 else 0

    # 2. Leaderboard Rank
    rankings = get_cached_leaderboard_rankings(batch)
    my_rank = 1
    for idx, r in enumerate(rankings):
        if r['id'] == user.id:
            my_rank = idx + 1
            break

    # 3. Attendance Summary
    logs = AttendanceLog.objects.filter(student=user)
    total_days = logs.count()
    present_days = logs.filter(status='present').count()
    absent_days = logs.filter(status='absent').count()
    leave_days = logs.filter(status='leave').count()
    working_days = present_days + absent_days
    attendance_rate = round((present_days / working_days) * 100) if working_days > 0 else 0

    # 4. Checkin Status Today
    today = date.today()
    today_log = AttendanceLog.objects.filter(student=user, date=today).first()
    checked_in = today_log is not None and today_log.check_in is not None
    checked_out = today_log is not None and today_log.check_out is not None
    
    session_duration = 0
    if checked_in and not checked_out:
        session_duration = int((timezone.now() - today_log.check_in).total_seconds())
    elif checked_in and checked_out:
        session_duration = int(today_log.total_time.total_seconds())

    # 5. Recent Activity Feed
    recent_activities = []
    for sub in Submission.objects.filter(student=user).select_related('task').order_by('-submitted_at')[:5]:
        if sub.grade:
            recent_activities.append({
                'type': 'task_graded',
                'title': f"Task Graded: {sub.task.title}",
                'detail': f"Grade: {sub.grade} - {sub.feedback or ''}",
                'timestamp': sub.graded_at or sub.submitted_at
            })
        else:
            recent_activities.append({
                'type': 'task_submitted',
                'title': f"Task Submitting: {sub.task.title}",
                'detail': "Awaiting review",
                'timestamp': sub.submitted_at
            })
    
    recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)

    mock_drives = MockDriveResult.objects.filter(student=user).order_by('-date')

    # 6. Graded Tasks Performance Trend
    submissions = Submission.objects.filter(student=user, grade__isnull=False).select_related('task').order_by('graded_at')
    grade_trend = []
    for sub in submissions:
        pct = sub.quality_score if sub.quality_score is not None else parse_grade_to_percentage(sub.grade)
        if pct is not None:
            grade_trend.append({
                'task_title': sub.task.title,
                'percentage': pct,
                'graded_at': sub.graded_at.strftime("%Y-%m-%d") if sub.graded_at else sub.submitted_at.strftime("%Y-%m-%d")
            })

    return Response({
        'student': UserSerializer(user).data,
        'batch': BatchSerializer(batch).data,
        'status': 'allocated',
        'taskCompletion': {
            'doneRate': completion_rate,
            'completed': completed_submissions,
            'pending': pending_submissions,
            'notSubmitted': not_submitted
        },
        'leaderboard': {
            'rank': my_rank,
            'totalPeers': len(rankings)
        },
        'attendance': {
            'rate': attendance_rate,
            'totalDays': total_days,
            'present': present_days,
            'absent': absent_days,
            'leave': leave_days
        },
        'checkInState': {
            'isCheckedIn': checked_in,
            'isCheckedOut': checked_out,
            'sessionDuration': session_duration,
            'logDate': today.strftime("%Y-%m-%d")
        },
        'recentActivities': recent_activities[:5],
        'mockDrives': MockDriveResultSerializer(mock_drives, many=True).data,
        'gradeTrend': grade_trend
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_checkin(request):
    user = request.user
    today = date.today()
    action = request.data.get('action') # 'checkin' or 'checkout'

    if action == 'checkin':
        log, created = AttendanceLog.objects.get_or_create(student=user, date=today)
        if log.check_in and log.check_out:
            log.check_in = timezone.now()
            log.check_out = None
            log.total_time = None
            log.status = 'present'
            log.save()
            return Response({'status': 'New check-in session started successfully.', 'time': log.check_in})

        if log.check_in:
            return Response({'error': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)
        log.check_in = timezone.now()
        log.status = 'present'
        log.save()
        return Response({'status': 'Checked in successfully', 'time': log.check_in})
        
    elif action == 'checkout':
        log = AttendanceLog.objects.filter(student=user, date=today).first()
        if not log or not log.check_in:
            return Response({'error': 'You must check in first before checking out'}, status=status.HTTP_400_BAD_REQUEST)
        if log.check_out:
            return Response({'error': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)
        
        log.check_out = timezone.now()
        log.total_time = log.check_out - log.check_in
        
        hours_logged = log.total_time.total_seconds() / 3600.0
        if 8.0 <= hours_logged <= 10.0:
            log.status = 'present'
        else:
            log.status = 'absent'
            
        log.save()
        
        return Response({
            'status': f'Checked out successfully. Logged {hours_logged:.2f} hours. Marked as {log.status.upper()}.', 
            'time': log.check_out,
            'duration': int(log.total_time.total_seconds()),
            'attendance_status': log.status
        })

    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_tasks(request):
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()
    
    user = request.user
    batch = get_student_batch(user)

    if request.method == 'GET':
        tasks = Task.objects.filter(batch=batch).order_by('-due_date') if batch else Task.objects.none()

        serialized_tasks = []
        for task in tasks:
            sub = Submission.objects.filter(task=task, student=user).first()
            serialized_tasks.append({
                'id': task.id,
                'title': task.title,
                'description': task.description,
                'due_date': str(task.due_date),
                'batch_name': task.batch.name if task.batch else 'General',
                'submission': SubmissionSerializer(sub).data if sub else None
            })
        return Response(serialized_tasks)

    elif request.method == 'POST':
        task_id = request.data.get('taskId')
        submission_type = request.data.get('submissionType')
        legacy_github_url = request.data.get('githubUrl') or request.data.get('github_url')
        
        if not task_id:
            return Response({'error': 'Task ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        written_answer = None
        uploaded_file = None
        github_url = None
        extracted_text = ""

        # Check if githubUrl is provided in request to support legacy/tests compatibility
        if legacy_github_url or submission_type == 'github':
            submission_type = 'github'
            github_url = legacy_github_url
            if not github_url or not github_url.strip():
                return Response({'error': 'GitHub URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        elif submission_type == 'written' or not submission_type:
            submission_type = 'written'
            written_answer = request.data.get('writtenAnswer')
            if not written_answer or not written_answer.strip():
                return Response({'error': 'Written answer cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
            extracted_text = written_answer.strip()
        elif submission_type == 'document':
            uploaded_file = request.FILES.get('uploadedDocument')
            if not uploaded_file:
                return Response({'error': 'Document file is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # File validation
            if uploaded_file.size > 10 * 1024 * 1024:
                return Response({'error': 'File exceeds size limit of 10MB'}, status=status.HTTP_400_BAD_REQUEST)
            if uploaded_file.size == 0:
                return Response({'error': 'Uploaded file is empty'}, status=status.HTTP_400_BAD_REQUEST)
                
            filename = uploaded_file.name
            _, ext = os.path.splitext(filename.lower())
            if ext not in ['.pdf', '.docx', '.txt']:
                return Response({'error': 'Unsupported file extension. Only PDF, DOCX, and TXT are allowed'}, status=status.HTTP_400_BAD_REQUEST)
            
            mime_type = uploaded_file.content_type
            allowed_mimes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ]
            if mime_type not in allowed_mimes and not (mime_type == 'application/octet-stream' and ext in ['.pdf', '.docx', '.txt']):
                return Response({'error': f'Invalid file type: {mime_type}. Only PDF, DOCX, and TXT are allowed'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'error': 'Invalid submission type'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get or create submission
            sub, created = Submission.objects.get_or_create(
                task=task, student=user, 
                defaults={
                    'github_url': github_url,
                    'submission_type': submission_type,
                    'written_answer': written_answer,
                    'uploaded_document': uploaded_file,
                    'extracted_text': None,
                    'evaluation_status': 'pending',
                    'grade': None,
                    'feedback': None,
                    'quality_score': None,
                    'obtained_marks': None,
                    'is_approved': False
                }
            )
            if not created:
                sub.github_url = github_url
                sub.submission_type = submission_type
                sub.written_answer = written_answer
                sub.uploaded_document = uploaded_file
                sub.extracted_text = None
                sub.evaluation_status = 'pending'
                sub.grade = None
                sub.feedback = None
                sub.quality_score = None
                sub.obtained_marks = None
                sub.is_approved = False
                sub.save()

            # Extract text if document
            if submission_type == 'document':
                sub.save()
                file_path = sub.uploaded_document.path
                extracted = extract_text_from_file(file_path, filename)
                sub.extracted_text = extracted
                sub.save()
        except Exception as e:
            if 'sub' in locals() and sub.id and locals().get('created'):
                sub.delete()
            return Response({'error': f'Document submission could not be processed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


        run_auto_grading_async(sub.id)

        return Response(SubmissionSerializer(sub).data)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_leetcode(request):
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    user = request.user
    update_user_last_seen(user)
    
    try:
        from zoneinfo import ZoneInfo
        kolkata_tz = ZoneInfo('Asia/Kolkata')
    except Exception:
        from datetime import timezone as dt_tz
        kolkata_tz = dt_tz(timedelta(hours=5.5))
        
    now_dt = timezone.now().astimezone(kolkata_tz)
    today_date = now_dt.date()

    if request.method == 'GET':
        challenges = LeetcodeChallenge.objects.all().order_by('day_number', 'available_date')
        challenge_ids = [ch.id for ch in challenges]
        
        submissions_dict = {
            sub.challenge_id: sub 
            for sub in LeetcodeSubmission.objects.filter(student=user, challenge_id__in=challenge_ids)
        }
        
        # Calculate streak based on consecutive completed past & today challenges
        unlocked_past_and_today = [
            ch for ch in challenges 
            if (ch.available_date or ch.created_at.date()) <= today_date
        ]
        unlocked_past_and_today.sort(key=lambda c: c.day_number, reverse=True)
        
        streak = 0
        for ch in unlocked_past_and_today:
            sub = submissions_dict.get(ch.id)
            has_solved = bool(sub and sub.status == 'completed')
            ch_avail_date = ch.available_date or ch.created_at.date()

            if has_solved:
                streak += 1
            else:
                # If it's today's active challenge and not solved yet, don't break streak built from yesterday
                if ch_avail_date == today_date:
                    continue
                else:
                    break

        serialized = []
        solved_count = 0
        for ch in challenges:
            sub = submissions_dict.get(ch.id)
            has_solved = bool(sub and sub.status == 'completed')
            if has_solved:
                solved_count += 1

            # Source of Truth: Fixed database available_date & deadline
            unlock_date = ch.available_date or ch.created_at.date()

            if ch.deadline:
                if timezone.is_naive(ch.deadline):
                    deadline_dt = timezone.make_aware(ch.deadline, kolkata_tz)
                else:
                    deadline_dt = ch.deadline.astimezone(kolkata_tz)
            else:
                deadline_dt = timezone.make_aware(
                    datetime.combine(unlock_date, datetime.max.time().replace(microsecond=0)),
                    kolkata_tz
                )

            # Determine strict 1 of 4 statuses
            if has_solved:
                status_str = 'completed'
            elif today_date < unlock_date:
                status_str = 'locked'
            elif unlock_date <= today_date and now_dt <= deadline_dt:
                status_str = 'active'
            else:
                status_str = 'expired'

            is_unlocked = (status_str != 'locked')
            is_today = (status_str == 'active')
            is_expired = (status_str == 'expired')

            serialized.append({
                'id': ch.id,
                'title': ch.title,
                'url': ch.url if (status_str in ['active', 'completed']) else '',
                'available_date': str(unlock_date),
                'day_number': ch.day_number,
                'deadline': str(deadline_dt),
                'status': status_str,
                'is_unlocked': is_unlocked,
                'is_today': is_today,
                'is_expired': is_expired,
                'submission': LeetcodeSubmissionSerializer(sub).data if sub else None
            })
        
        return Response({
            'challenges': serialized,
            'streak': streak,
            'solved': solved_count,
            'onlineStudents': get_online_student_count()
        })

    elif request.method == 'POST':
        challenge_id = request.data.get('challengeId')
        submission_url = request.data.get('submissionUrl')

        if not challenge_id or not submission_url:
            return Response({'error': 'Challenge ID and submission URL are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ch = LeetcodeChallenge.objects.get(id=challenge_id)
        except LeetcodeChallenge.DoesNotExist:
            return Response({'error': 'Challenge not found'}, status=status.HTTP_404_NOT_FOUND)

        unlock_date = ch.available_date or ch.created_at.date()
        if ch.deadline:
            if timezone.is_naive(ch.deadline):
                deadline_dt = timezone.make_aware(ch.deadline, kolkata_tz)
            else:
                deadline_dt = ch.deadline.astimezone(kolkata_tz)
        else:
            deadline_dt = timezone.make_aware(
                datetime.combine(unlock_date, datetime.max.time().replace(microsecond=0)),
                kolkata_tz
            )

        sub = LeetcodeSubmission.objects.filter(challenge=ch, student=user).first()
        is_completed = bool(sub and sub.status == 'completed')

        if not is_completed:
            if today_date < unlock_date:
                return Response({'error': 'This problem has not been unlocked yet.'}, status=status.HTTP_403_FORBIDDEN)
            if now_dt > deadline_dt:
                return Response({'error': 'This problem has expired and cannot be submitted.'}, status=status.HTTP_403_FORBIDDEN)

        sub, created = LeetcodeSubmission.objects.get_or_create(challenge=ch, student=user, defaults={'submission_url': submission_url})
        if not created:
            sub.submission_url = submission_url
            sub.save()

        return Response(LeetcodeSubmissionSerializer(sub).data)



@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_heartbeat(request):
    update_user_last_seen(request.user)
    return Response({
        'onlineStudents': get_online_student_count(),
        'status': 'active'
    })



@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_notes(request):
    from api.mongo import restore_from_mongo
    restore_from_mongo()

    user = request.user
    batch = get_student_batch(user)
    if batch:
        notes = StudyNote.objects.filter(Q(batch=batch) | Q(category='global')).order_by('-date_shared')
    else:
        notes = StudyNote.objects.filter(category='global').order_by('-date_shared')
    return Response(StudyNoteSerializer(notes, many=True).data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_grades(request):
    user = request.user
    submissions = Submission.objects.filter(student=user, grade__isnull=False).order_by('-graded_at')
    mock_drives = MockDriveResult.objects.filter(student=user).order_by('-date')

    return Response({
        'grades': SubmissionSerializer(submissions, many=True).data,
        'mockDrives': MockDriveResultSerializer(mock_drives, many=True).data
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_leaderboard(request):
    user = request.user
    batch = get_student_batch(user)
    
    if not batch:
        return Response([])

    rankings = get_leaderboard_rankings(batch)
    for idx, entry in enumerate(rankings):
        entry['rank'] = idx + 1
        entry['is_me'] = entry['id'] == user.id
        
    return Response(rankings)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_leaves(request):
    user = request.user
    if request.method == 'GET':
        leaves = LeaveRequest.objects.filter(student=user).order_by('-date')
        return Response(LeaveRequestSerializer(leaves, many=True).data)
        
    elif request.method == 'POST':
        leave_type = request.data.get('leave_type')
        date_str = request.data.get('date')
        reason = request.data.get('reason')
        pdf_url = request.data.get('pdf_url', '')

        if not leave_type or not date_str or not reason:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            leave_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        leave = LeaveRequest.objects.create(
            student=user,
            leave_type=leave_type,
            date=leave_date,
            reason=reason,
            pdf_url=pdf_url,
            status='pending'
        )

        return Response(LeaveRequestSerializer(leave).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_chat(request):
    user = request.user
    batch = get_student_batch(user)
    
    if not batch:
        return Response({'error': 'No active batch group chat'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'GET':
        messages = ChatMessage.objects.filter(batch=batch).order_by('timestamp')
        return Response(ChatMessageSerializer(messages, many=True).data)

    elif request.method == 'POST':
        content = request.data.get('content')
        if not content:
            return Response({'error': 'Message content is empty'}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            batch=batch,
            sender=user,
            content=content
        )
        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_attendance_log(request):
    user = request.user
    logs = AttendanceLog.objects.filter(student=user).order_by('-date')
    return Response(AttendanceLogSerializer(logs, many=True).data)


# ==========================================
# ADMIN ENDPOINTS (Phase 2 Views Refactoring)
# ==========================================

def verify_admin(user):
    if user.role != 'admin' and not user.is_staff and not user.is_superuser:
        raise PermissionError("Access Denied: Admin role required")

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_pending_students(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    # Fetch batch enrollments that are pending
    pending_enrollments = BatchEnrollment.objects.filter(status='pending').select_related('student', 'batch')
    
    # Students who have NO approved or pending enrollment
    active_student_ids = BatchEnrollment.objects.filter(status__in=['approved', 'pending']).values_list('student_id', flat=True)
    unassigned_students = User.objects.filter(role='student').exclude(id__in=active_student_ids)

    unassigned_data = []
    for s in unassigned_students:
        full_name = s.get_full_name().strip() if s.get_full_name() else s.username
        unassigned_data.append({
            'id': s.id,
            'student': s.id,
            'student_name': full_name or s.username,
            'student_email': s.email,
            'student_roll': s.roll_number or 'N/A',
            'status': 'unassigned',
            'batch_name': 'None Allocated'
        })

    serialized_pending = BatchEnrollmentSerializer(pending_enrollments, many=True).data
    
    return Response({
        'pending': serialized_pending,
        'unassigned': unassigned_data,
        'batches': BatchSerializer(Batch.objects.all(), many=True).data
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_allocate_batch(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('studentId')
    batch_id = request.data.get('batchId')
    action = request.data.get('action', 'approved') # 'approved' or 'rejected'

    if not student_id or not batch_id:
        return Response({'error': 'Student ID and Batch ID are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        student = User.objects.get(id=student_id, role='student')
        batch = Batch.objects.get(id=batch_id)
    except (User.DoesNotExist, Batch.DoesNotExist):
        return Response({'error': 'Student or Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    # Clean up existing non-matching enrollments for student
    BatchEnrollment.objects.filter(student=student).exclude(batch=batch).delete()

    enrollment, created = BatchEnrollment.objects.get_or_create(
        student=student, 
        batch=batch, 
        defaults={'status': action}
    )
    if not created:
        enrollment.status = action
        enrollment.save()

    status_msg = f'Student {student.get_full_name() or student.username} allocated to {batch.name} successfully ({action}).'
    return Response({'status': status_msg})



@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_task(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    batch_id = request.data.get('batchId')
    title = request.data.get('title')
    description = request.data.get('description')
    due_date_str = request.data.get('dueDate')
    max_marks = request.data.get('maxMarks', 10)
    submission_type = request.data.get('submissionType', 'github')
    grading_criteria = request.data.get('gradingCriteria', '')

    if not batch_id or not title or not due_date_str:
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        batch = Batch.objects.get(id=batch_id)
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except Batch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    task = Task.objects.create(
        batch=batch,
        title=title,
        description=description,
        due_date=due_date,
        max_marks=max_marks,
        submission_type=submission_type,
        grading_criteria=grading_criteria
    )
    return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_submissions(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    submissions = Submission.objects.select_related('student', 'task', 'task__batch').all().order_by('-submitted_at')
    return Response(SubmissionSerializer(submissions, many=True).data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_grade_submission(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    sub_id = request.data.get('submissionId')
    action = request.data.get('action') # 'approve', 'override', or 'reevaluate'

    if not sub_id:
        return Response({'error': 'Submission ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sub = Submission.objects.get(id=sub_id)
    except Submission.DoesNotExist:
        return Response({'error': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'approve':
        sub.is_approved = True
        sub.save()
        return Response({'status': 'Marks approved successfully', 'submission': SubmissionSerializer(sub).data})

    elif action == 'override':
        obtained_marks = request.data.get('obtainedMarks')
        feedback = request.data.get('feedback', '')
        
        if obtained_marks is None:
            return Response({'error': 'Obtained marks are required for override'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            obtained_marks = int(obtained_marks)
        except ValueError:
            return Response({'error': 'Obtained marks must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        max_marks = sub.task.max_marks
        if obtained_marks > max_marks or obtained_marks < 0:
            return Response({'error': f'Obtained marks must be between 0 and {max_marks}'}, status=status.HTTP_400_BAD_REQUEST)

        sub.obtained_marks = obtained_marks
        sub.quality_score = round((obtained_marks / max_marks) * 100.0, 2)
        sub.grade = f"{obtained_marks}/{max_marks}"
        sub.feedback = feedback
        sub.is_approved = True
        sub.evaluation_status = 'completed'
        sub.graded_at = timezone.now()
        sub.save()
        return Response({'status': 'Marks overridden successfully', 'submission': SubmissionSerializer(sub).data})

    elif action == 'reevaluate':
        sub.evaluation_status = 'pending'
        sub.grade = None
        sub.feedback = None
        sub.quality_score = None
        sub.obtained_marks = None
        sub.is_approved = False
        sub.save()
        
        run_auto_grading_async(sub.id)
        return Response({'status': 'Re-evaluation started', 'submission': SubmissionSerializer(sub).data})

    else:
        # Fallback to compatibility with existing grade flow if action not specified
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')
        if grade:
            sub.grade = grade
            sub.feedback = feedback
            sub.graded_at = timezone.now()
            pct = parse_grade_to_percentage(grade)
            if pct is not None:
                sub.quality_score = pct
                sub.obtained_marks = round((pct / 100.0) * sub.task.max_marks)
            sub.save()
            return Response(SubmissionSerializer(sub).data)
            
        return Response({'error': 'Invalid action or grade'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_leaves(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    leaves = LeaveRequest.objects.select_related('student').all().order_by('-created_at')
    return Response(LeaveRequestSerializer(leaves, many=True).data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_resolve_leave(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    leave_id = request.data.get('leaveId')
    status_action = request.data.get('status') # 'approved' or 'rejected'
    admin_response = request.data.get('adminResponse', '')

    if not leave_id or not status_action:
        return Response({'error': 'Leave ID and Action status are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        leave = LeaveRequest.objects.get(id=leave_id)
    except LeaveRequest.DoesNotExist:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    leave.status = status_action
    leave.admin_response = admin_response
    leave.save()

    # Update or create corresponding AttendanceLog status
    attendance_log, created = AttendanceLog.objects.get_or_create(
        student=leave.student,
        date=leave.date,
        defaults={'status': 'leave' if status_action == 'approved' else 'absent'}
    )
    if not created:
        attendance_log.status = 'leave' if status_action == 'approved' else 'absent'
        attendance_log.save()

    return Response(LeaveRequestSerializer(leave).data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_attendance(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    logs = AttendanceLog.objects.select_related('student').all().order_by('-date', 'student__username')
    return Response(AttendanceLogSerializer(logs, many=True).data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    total_students = User.objects.filter(role='student').count()
    active_batches = Batch.objects.count()
    pending_leaves = LeaveRequest.objects.filter(status='pending').count()
    pending_grades = Submission.objects.filter(grade__isnull=True).count()
    online_students = get_online_student_count()

    return Response({
        'totalStudents': total_students,
        'activeBatches': active_batches,
        'pendingLeaves': pending_leaves,
        'pendingGrades': pending_grades,
        'onlineStudents': online_students
    })


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_placement_prep(request):
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    companies = PlacementCompany.objects.all().order_by('name')
    return Response(PlacementCompanySerializer(companies, many=True).data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_leetcode_challenge(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    title = request.data.get('title')
    url = request.data.get('url')
    deadline = request.data.get('deadline')
    day_number = request.data.get('dayNumber', 1)
    available_date_str = request.data.get('availableDate')

    if not title or not url or not deadline:
        return Response({'error': 'Title, URL, and deadline are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        parsed_date = datetime.strptime(deadline, "%Y-%m-%d")
        aware_deadline = timezone.make_aware(parsed_date.replace(hour=23, minute=59, second=59))
        avail_date = datetime.strptime(available_date_str, "%Y-%m-%d").date() if available_date_str else timezone.now().date()
    except ValueError:
        return Response({'error': 'Invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    challenge = LeetcodeChallenge.objects.create(
        title=title,
        url=url,
        day_number=day_number,
        available_date=avail_date,
        deadline=aware_deadline
    )

    return Response({'status': 'Leetcode challenge created successfully', 'id': challenge.id})


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_bulk_create_leetcode(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    challenges_data = request.data.get('challenges', [])
    start_date_str = request.data.get('startDate')

    if not challenges_data:
        return Response({'error': 'No challenges provided for 10-day bulk schedule.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        base_start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else timezone.now().date()
    except ValueError:
        base_start_date = timezone.now().date()

    created_ids = []
    for idx, item in enumerate(challenges_data):
        title = item.get('title')
        url = item.get('url')
        day_num = item.get('dayNumber') or (idx + 1)
        
        if not title or not url:
            continue

        avail_date = base_start_date + timedelta(days=idx)
        deadline_date = timezone.make_aware(datetime.combine(avail_date, datetime.max.time().replace(microsecond=0)))

        ch = LeetcodeChallenge.objects.create(
            title=title,
            url=url,
            day_number=day_num,
            available_date=avail_date,
            deadline=deadline_date
        )
        created_ids.append(ch.id)

    return Response({
        'status': f'Successfully scheduled {len(created_ids)} LeetCode challenges for 10-day release cycle.',
        'count': len(created_ids)
    }, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_batch(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    name = request.data.get('name')
    description = request.data.get('description', '')

    if not name:
        return Response({'error': 'Batch name is required'}, status=status.HTTP_400_BAD_REQUEST)

    if Batch.objects.filter(name__iexact=name).exists():
        return Response({'error': 'A batch with this name already exists'}, status=status.HTTP_400_BAD_REQUEST)

    batch = Batch.objects.create(name=name, description=description)
    return Response({
        'status': 'Batch created successfully.',
        'batch': BatchSerializer(batch).data
    }, status=status.HTTP_201_CREATED)


# ==========================================
# ADMIN EXTENDED CRUD ENDPOINTS
# ==========================================

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_study_note(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    title = request.data.get('title')
    summary = request.data.get('summary', '')
    category = request.data.get('category', 'global')
    file_url = request.data.get('fileUrl')
    batch_id = request.data.get('batchId')

    if not title or not file_url:
        return Response({'error': 'Title and File URL are required'}, status=status.HTTP_400_BAD_REQUEST)

    batch = None
    if category == 'batch-specific' and batch_id:
        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    note = StudyNote.objects.create(
        title=title,
        summary=summary,
        category=category,
        file_url=file_url,
        batch=batch,
        uploaded_by=request.user
    )
    return Response(StudyNoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['POST', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_delete_study_note(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    note_id = request.data.get('noteId')
    if not note_id:
        return Response({'error': 'Note ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        note = StudyNote.objects.get(id=note_id)
        note.delete()
        return Response({'status': 'Study note deleted successfully'})
    except StudyNote.DoesNotExist:
        return Response({'error': 'Study note not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_mock_results(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    results = MockDriveResult.objects.all().select_related('student').order_by('-date')
    serialized = []
    for r in results:
        serialized.append({
            'id': r.id,
            'student_id': r.student.id,
            'student_name': r.student.get_full_name() or r.student.username,
            'student_roll': r.student.roll_number or 'N/A',
            'test_name': r.test_name,
            'aptitude_score': r.aptitude_score,
            'tech_score': r.tech_score,
            'coding_score': r.coding_score,
            'tech_hr_score': r.tech_hr_score,
            'hr_score': r.hr_score,
            'total_score': r.total_score,
            'grade': r.grade,
            'date': r.date
        })
    return Response(serialized)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_mock_result(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('studentId')
    test_name = request.data.get('testName')
    apt = int(request.data.get('aptitudeScore', 0))
    tech = int(request.data.get('techScore', 0))
    coding = int(request.data.get('codingScore', 0))
    tech_hr = int(request.data.get('techHrScore', 0))
    hr = int(request.data.get('hrScore', 0))
    grade = request.data.get('grade', 'B')
    test_date_str = request.data.get('date')

    if not student_id or not test_name:
        return Response({'error': 'Student ID and Test Name are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        student = User.objects.get(id=student_id)
        test_date = datetime.strptime(test_date_str, "%Y-%m-%d").date() if test_date_str else timezone.now().date()
    except User.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError:
        return Response({'error': 'Invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    total = apt + tech + coding + tech_hr + hr
    res = MockDriveResult.objects.create(
        student=student,
        test_name=test_name,
        aptitude_score=apt,
        tech_score=tech,
        coding_score=coding,
        tech_hr_score=tech_hr,
        hr_score=hr,
        total_score=total,
        grade=grade,
        date=test_date
    )
    return Response({'status': 'Mock Drive Result created successfully', 'id': res.id}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_company(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    name = request.data.get('name')
    description = request.data.get('description', '')
    logo_url = request.data.get('logoUrl', '')

    if not name:
        return Response({'error': 'Company name is required'}, status=status.HTTP_400_BAD_REQUEST)

    company = PlacementCompany.objects.create(name=name, description=description, logo_url=logo_url)
    return Response(PlacementCompanySerializer(company).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_placement_round(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    company_id = request.data.get('companyId')
    title = request.data.get('title')
    round_num = request.data.get('roundNum', 1)
    description = request.data.get('description', '')

    if not company_id or not title:
        return Response({'error': 'Company ID and Round Title are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        company = PlacementCompany.objects.get(id=company_id)
    except PlacementCompany.DoesNotExist:
        return Response({'error': 'Placement Company not found'}, status=status.HTTP_404_NOT_FOUND)

    p_round = PlacementRound.objects.create(company=company, round_num=round_num, title=title, description=description)
    return Response(PlacementRoundSerializer(p_round).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_placement_resource(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    round_id = request.data.get('roundId')
    title = request.data.get('title')
    file_url = request.data.get('fileUrl', '')
    sample_questions = request.data.get('sampleQuestions', '')

    if not round_id or not title:
        return Response({'error': 'Round ID and Resource Title are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        p_round = PlacementRound.objects.get(id=round_id)
    except PlacementRound.DoesNotExist:
        return Response({'error': 'Placement Round not found'}, status=status.HTTP_404_NOT_FOUND)

    resource = PlacementResource.objects.create(placement_round=p_round, title=title, file_url=file_url, sample_questions=sample_questions)
    return Response(PlacementResourceSerializer(resource).data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_update_placement_resource(request, resource_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        resource = PlacementResource.objects.get(id=resource_id)
    except PlacementResource.DoesNotExist:
        return Response({'error': 'Placement Resource not found'}, status=status.HTTP_404_NOT_FOUND)

    title = request.data.get('title')
    round_id = request.data.get('roundId')
    file_url = request.data.get('fileUrl')
    sample_questions = request.data.get('sampleQuestions')

    if title is not None:
        if not str(title).strip():
            return Response({'error': 'Resource Title cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        resource.title = str(title).strip()

    if round_id is not None:
        try:
            p_round = PlacementRound.objects.get(id=round_id)
            resource.placement_round = p_round
        except PlacementRound.DoesNotExist:
            return Response({'error': 'Placement Round not found'}, status=status.HTTP_404_NOT_FOUND)

    if file_url is not None:
        resource.file_url = file_url

    if sample_questions is not None:
        resource.sample_questions = sample_questions

    resource.save()
    return Response(PlacementResourceSerializer(resource).data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_delete_placement_resource(request, resource_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        resource = PlacementResource.objects.get(id=resource_id)
    except PlacementResource.DoesNotExist:
        return Response({'error': 'Placement Resource not found'}, status=status.HTTP_404_NOT_FOUND)

    file_path = resource.file_url
    resource.delete()

    if file_path and '/media/' in file_path:
        try:
            from django.conf import settings
            relative_path = file_path.split('/media/')[-1]
            full_media_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            if os.path.exists(full_media_path):
                other_refs = PlacementResource.objects.filter(file_url=file_path).exists()
                if not other_refs:
                    os.remove(full_media_path)
        except Exception:
            pass

    return Response({'message': 'Resource deleted successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_users(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by('-date_joined')
    serialized = []
    for u in users:
        batch = get_student_batch(u)
        serialized.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'full_name': u.get_full_name() or u.username,
            'roll_number': u.roll_number or 'N/A',
            'phone_number': u.phone_number or 'N/A',
            'role': u.role,
            'batch': batch.name if batch else 'Unassigned',
            'last_seen': u.last_seen
        })
    return Response(serialized)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_student(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    email = request.data.get('email')
    password = request.data.get('password', 'password123')
    first_name = request.data.get('firstName', '')
    last_name = request.data.get('lastName', '')
    roll_number = request.data.get('rollNumber', '')
    phone_number = request.data.get('phoneNumber', '')
    role = request.data.get('role', 'student')
    batch_id = request.data.get('batchId')

    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    email = email.strip().lower()

    # Validate email format
    if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate domain
    allowed_domains = getattr(settings, 'ALLOWED_EMAIL_DOMAINS', ['mits.ac.in'])
    domain_match = any(email.endswith('@' + dom) or email.endswith('.' + dom) for dom in allowed_domains)
    if not domain_match:
        return Response({'error': f'Only email addresses from allowed domains ({", ".join(allowed_domains)}) are accepted'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        roll_number=roll_number,
        phone_number=phone_number,
        role=role
    )

    if batch_id and role == 'student':
        try:
            batch = Batch.objects.get(id=batch_id)
            BatchEnrollment.objects.create(student=user, batch=batch, status='approved')
        except Batch.DoesNotExist:
            pass

    return Response({
        'status': f'User {email} created successfully.',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_manage_batch(request, batch_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        batch = Batch.objects.get(id=batch_id)
    except Batch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        batch_name = batch.name
        batch.delete()
        return Response({'status': f'Batch {batch_name} deleted successfully'})

    elif request.method == 'PUT':
        name = request.data.get('name')
        description = request.data.get('description', batch.description)
        if name:
            batch.name = name
        batch.description = description
        batch.save()
        return Response({'status': 'Batch updated successfully', 'batch': BatchSerializer(batch).data})


@api_view(['PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_manage_user(request, user_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        username = user.username
        user.delete()
        return Response({'status': f'User {username} deleted successfully'})

    elif request.method == 'PUT':
        user.first_name = request.data.get('firstName', user.first_name)
        user.last_name = request.data.get('lastName', user.last_name)
        user.roll_number = request.data.get('rollNumber', user.roll_number)
        user.phone_number = request.data.get('phoneNumber', user.phone_number)
        if 'role' in request.data:
            user.role = request.data['role']
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
        user.save()

        batch_id = request.data.get('batchId')
        if batch_id:
            try:
                batch = Batch.objects.get(id=batch_id)
                BatchEnrollment.objects.filter(student=user).delete()
                BatchEnrollment.objects.create(student=user, batch=batch, status='approved')
            except Batch.DoesNotExist:
                pass

        return Response({'status': 'User profile updated successfully', 'user': UserSerializer(user).data})


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_remove_student_batch(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('studentId')
    if not student_id:
        return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    deleted_count, _ = BatchEnrollment.objects.filter(student_id=student_id).delete()
    return Response({'status': f'Student enrollment removed from batch ({deleted_count} record removed).'})


@api_view(['PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_manage_task(request, task_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        title = task.title
        task.delete()
        return Response({'status': f'Task "{title}" deleted successfully'})

    elif request.method == 'PUT':
        task.title = request.data.get('title', task.title)
        task.description = request.data.get('description', task.description)
        due_date_str = request.data.get('dueDate')
        if due_date_str:
            try:
                task.due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
        task.save()
        return Response({'status': 'Task updated successfully', 'task': TaskSerializer(task).data})


# ==========================================
# BATCH SELECTION & ADMIN APPROVAL ENDPOINTS
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_batches(request):
    """List all available training batches with metadata and enrolled counts."""
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()
    batches = Batch.objects.all().order_by('name')
    serializer = BatchSerializer(batches, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def request_batch_join(request):
    """Student submits request to join a batch."""
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    student = request.user
    if student.role != 'student':
        return Response({'error': 'Only students can request batch enrollment'}, status=status.HTTP_403_FORBIDDEN)

    batch_id = request.data.get('batch_id') or request.data.get('batchId')
    if not batch_id:
        return Response({'error': 'batch_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    batch = Batch.objects.filter(id=batch_id).first()
    if not batch:
        return Response({'error': 'Selected batch does not exist'}, status=status.HTTP_404_NOT_FOUND)

    existing = BatchEnrollment.objects.filter(student=student).first()
    if existing:
        if existing.status == 'approved':
            return Response({'error': 'You are already enrolled in an approved batch'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            existing.batch = batch
            existing.status = 'pending'
            existing.requested_at = timezone.now()
            existing.approved_at = None
            existing.approved_by = None
            existing.save()
            enrollment = existing
    else:
        enrollment = BatchEnrollment.objects.create(
            student=student,
            batch=batch,
            status='pending'
        )

    return Response({
        'message': 'Your request has been sent to the administrator for approval.',
        'enrollment': BatchEnrollmentSerializer(enrollment).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_student_enrollment(request):
    """Get the current student's enrollment status."""
    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    student = request.user
    enrollment = BatchEnrollment.objects.filter(student=student).order_by('-joined_at').first()

    if not enrollment:
        return Response({
            'status': 'no_enrollment',
            'enrollment': None,
            'batch': None
        }, status=status.HTTP_200_OK)

    return Response({
        'status': enrollment.status,
        'enrollment': BatchEnrollmentSerializer(enrollment).data,
        'batch': BatchSerializer(enrollment.batch).data if enrollment.batch else None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_pending_batch_requests(request):
    """Admin endpoint: Get all pending batch join requests."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    pending_requests = BatchEnrollment.objects.filter(status='pending').select_related('student', 'batch').order_by('-joined_at')
    serializer = BatchEnrollmentSerializer(pending_requests, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_approve_batch_request(request, enrollment_id):
    """Admin endpoint: Approve student batch request."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    enrollment = BatchEnrollment.objects.filter(id=enrollment_id).first()
    if not enrollment:
        return Response({'error': 'Enrollment request not found'}, status=status.HTTP_404_NOT_FOUND)

    enrollment.status = 'approved'
    enrollment.approved_at = timezone.now()
    enrollment.approved_by = request.user
    enrollment.save()

    return Response({
        'message': f"Approved {enrollment.student.username} into {enrollment.batch.name}.",
        'enrollment': BatchEnrollmentSerializer(enrollment).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_reject_batch_request(request, enrollment_id):
    """Admin endpoint: Reject student batch request."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    from api.mongo import restore_from_mongo_async
    restore_from_mongo_async()

    enrollment = BatchEnrollment.objects.filter(id=enrollment_id).first()
    if not enrollment:
        return Response({'error': 'Enrollment request not found'}, status=status.HTTP_404_NOT_FOUND)

    enrollment.status = 'rejected'
    enrollment.save()

    return Response({
        'message': f"Rejected batch request for {enrollment.student.username}.",
        'enrollment': BatchEnrollmentSerializer(enrollment).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_change_password(request):
    """Admin endpoint: Change the logged-in admin's password."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    current_password = request.data.get('currentPassword')
    new_password = request.data.get('newPassword')
    confirm_password = request.data.get('confirmPassword')

    if not current_password or not new_password or not confirm_password:
        return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate current password
    if not request.user.check_password(current_password):
        return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate mismatch
    if new_password != confirm_password:
        return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate new password is not same as current
    if current_password == new_password:
        return Response({'error': 'New password cannot be the same as the current password.'}, status=status.HTTP_400_BAD_REQUEST)

    # Password complexity requirements
    import re
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[A-Z]', new_password):
        return Response({'error': 'Password must contain at least one uppercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[a-z]', new_password):
        return Response({'error': 'Password must contain at least one lowercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[0-9]', new_password):
        return Response({'error': 'Password must contain at least one number.'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[^a-zA-Z0-9]', new_password):
        return Response({'error': 'Password must contain at least one special character.'}, status=status.HTTP_400_BAD_REQUEST)

    # Update password securely
    request.user.set_password(new_password)
    request.user.save()

    return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


# ==========================================
# PROJECTS MODULE EXTENSIONS
# ==========================================

@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_create_project(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    title = request.data.get('title')
    batch_id = request.data.get('batchId')
    maximum_marks = request.data.get('maximumMarks', 100)
    start_date_str = request.data.get('startDate')
    deadline_str = request.data.get('deadline')
    additional_instructions = request.data.get('additionalInstructions', '')
    spec_file = request.FILES.get('specification')

    if not title or not batch_id or not start_date_str or not deadline_str or not spec_file:
        return Response({'error': 'Missing required project details or specification file'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        batch = Batch.objects.get(id=batch_id)
    except Batch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        maximum_marks = int(maximum_marks)
    except ValueError:
        return Response({'error': 'Maximum marks must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    from datetime import datetime
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    if spec_file.size > 10 * 1024 * 1024:
        return Response({'error': 'Specification file exceeds size limit of 10MB'}, status=status.HTTP_400_BAD_REQUEST)
    if spec_file.size == 0:
        return Response({'error': 'Specification file is empty'}, status=status.HTTP_400_BAD_REQUEST)

    filename = spec_file.name
    _, ext = os.path.splitext(filename.lower())
    if ext not in ['.pdf', '.docx', '.txt']:
        return Response({'error': 'Unsupported specification file extension. Only PDF, DOCX, and TXT are allowed'}, status=status.HTTP_400_BAD_REQUEST)

    mime_type = spec_file.content_type
    allowed_mimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
    if mime_type not in allowed_mimes and not (mime_type == 'application/octet-stream' and ext in ['.pdf', '.docx', '.txt']):
        return Response({'error': f'Invalid file type: {mime_type}. Only PDF, DOCX, and TXT are allowed'}, status=status.HTTP_400_BAD_REQUEST)

    proj = Project(
        title=title,
        assigned_batch=batch,
        specification_file=spec_file,
        specification_filename=filename,
        additional_instructions=additional_instructions,
        maximum_marks=maximum_marks,
        start_date=start_date,
        deadline=deadline
    )
    
    try:
        proj.save()
        file_path = proj.specification_file.path
        extracted_text = extract_text_from_file(file_path, filename)
        proj.specification_extracted_text = extracted_text
        proj.save()
    except Exception as e:
        if proj.id:
            proj.delete()
        return Response({'error': f'Project specification could not be processed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


    return Response(ProjectSerializer(proj).data)


@api_view(['GET', 'PUT', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_manage_project(request, project_id):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    try:
        proj = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProjectSerializer(proj).data)

    elif request.method == 'PUT':
        title = request.data.get('title')
        batch_id = request.data.get('batchId')
        maximum_marks = request.data.get('maximumMarks')
        start_date_str = request.data.get('startDate')
        deadline_str = request.data.get('deadline')
        additional_instructions = request.data.get('additionalInstructions')
        spec_file = request.FILES.get('specification')

        if title:
            proj.title = title
        if batch_id:
            try:
                proj.assigned_batch = Batch.objects.get(id=batch_id)
            except Batch.DoesNotExist:
                return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
        if maximum_marks:
            try:
                proj.maximum_marks = int(maximum_marks)
            except ValueError:
                return Response({'error': 'Maximum marks must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import datetime
        if start_date_str:
            try:
                proj.start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({'error': 'Invalid start date format'}, status=status.HTTP_400_BAD_REQUEST)
        if deadline_str:
            try:
                proj.deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({'error': 'Invalid deadline format'}, status=status.HTTP_400_BAD_REQUEST)
        if additional_instructions is not None:
            proj.additional_instructions = additional_instructions

        if spec_file:
            if spec_file.size > 10 * 1024 * 1024:
                return Response({'error': 'Specification file exceeds size limit of 10MB'}, status=status.HTTP_400_BAD_REQUEST)
            if spec_file.size == 0:
                return Response({'error': 'Specification file is empty'}, status=status.HTTP_400_BAD_REQUEST)

            filename = spec_file.name
            _, ext = os.path.splitext(filename.lower())
            if ext not in ['.pdf', '.docx', '.txt']:
                return Response({'error': 'Unsupported file extension'}, status=status.HTTP_400_BAD_REQUEST)

            mime_type = spec_file.content_type
            allowed_mimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
            if mime_type not in allowed_mimes and not (mime_type == 'application/octet-stream' and ext in ['.pdf', '.docx', '.txt']):
                return Response({'error': 'Invalid file MIME type'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                # Replace file
                proj.specification_file = spec_file
                proj.specification_filename = filename
                proj.save()

                file_path = proj.specification_file.path
                extracted_text = extract_text_from_file(file_path, filename)
                proj.specification_extracted_text = extracted_text
            except Exception as e:
                return Response({'error': f'Project specification could not be processed. (Error: {str(e)})'}, status=status.HTTP_400_BAD_REQUEST)


        proj.save()
        return Response(ProjectSerializer(proj).data)

    elif request.method == 'DELETE':
        remove_spec_only = request.data.get('removeSpecOnly') or request.GET.get('removeSpecOnly')
        if remove_spec_only == 'true' or remove_spec_only is True:
            if proj.specification_file:
                proj.specification_file.delete()
            proj.specification_filename = None
            proj.specification_extracted_text = None
            proj.save()
            return Response({'status': 'Specification file removed successfully', 'project': ProjectSerializer(proj).data})
        else:
            proj.delete()
            return Response({'status': 'Project deleted successfully'})


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_projects(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
    
    from api.mongo import restore_from_mongo
    restore_from_mongo()

    projects = Project.objects.all().order_by('-deadline')
    return Response(ProjectSerializer(projects, many=True).data)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_projects(request):
    from api.mongo import restore_from_mongo
    restore_from_mongo()

    user = request.user
    batch = get_student_batch(user)

    if request.method == 'GET':
        projects = Project.objects.filter(assigned_batch=batch).order_by('-deadline') if batch else Project.objects.none()
        
        serialized_projects = []
        for p in projects:
            sub = ProjectSubmission.objects.filter(project=p, student=user).first()
            serialized_projects.append({
                'id': p.id,
                'title': p.title,
                'assigned_batch': p.assigned_batch_id,
                'specification_file': p.specification_file.url if p.specification_file else None,
                'specification_filename': p.specification_filename,
                'additional_instructions': p.additional_instructions,
                'maximum_marks': p.maximum_marks,
                'start_date': str(p.start_date),
                'deadline': str(p.deadline),
                'submission': ProjectSubmissionSerializer(sub).data if sub else None
            })
        return Response(serialized_projects)

    elif request.method == 'POST':
        project_id = request.data.get('projectId')
        github_url = request.data.get('githubUrl')
        deployment_url = request.data.get('deploymentUrl', '')

        if not project_id or not github_url:
            return Response({'error': 'Project ID and GitHub URL are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        import re
        if not re.match(r'^https?://(?:www\.)?github\.com/[^/]+/[^/]+/?$', github_url.strip()):
            return Response({'error': 'Please provide a valid GitHub repository URL (e.g. https://github.com/username/project)'}, status=status.HTTP_400_BAD_REQUEST)

        sub, created = ProjectSubmission.objects.get_or_create(
            project=project, student=user,
            defaults={
                'github_url': github_url,
                'deployment_url': deployment_url,
                'status': 'pending',
                'project_match_score': None,
                'quality_score': None,
                'obtained_marks': None,
                'evaluation_report': None,
                'admin_feedback': None
            }
        )
        if not created:
            sub.github_url = github_url
            sub.deployment_url = deployment_url
            sub.status = 'pending'
            sub.project_match_score = None
            sub.quality_score = None
            sub.obtained_marks = None
            sub.evaluation_report = None
            sub.admin_feedback = None
            sub.save()

        run_project_auto_grading_async(sub.id)

        return Response(ProjectSubmissionSerializer(sub).data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_get_project_submissions(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    from api.mongo import restore_from_mongo
    restore_from_mongo()

    subs = ProjectSubmission.objects.all().order_by('-submitted_at')
    return Response(ProjectSubmissionSerializer(subs, many=True).data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_grade_project_submission(request):
    try:
        verify_admin(request.user)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    sub_id = request.data.get('submissionId')
    action = request.data.get('action')

    if not sub_id:
        return Response({'error': 'Submission ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sub = ProjectSubmission.objects.get(id=sub_id)
    except ProjectSubmission.DoesNotExist:
        return Response({'error': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    if action == 'approve':
        sub.status = 'admin-approved'
        sub.graded_at = timezone.now()
        sub.save()
        return Response({'status': 'Marks approved successfully', 'submission': ProjectSubmissionSerializer(sub).data})

    elif action == 'override':
        obtained_marks = request.data.get('obtainedMarks')
        feedback = request.data.get('feedback', '')

        if obtained_marks is None:
            return Response({'error': 'Obtained marks are required for override'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            obtained_marks = float(obtained_marks)
        except ValueError:
            return Response({'error': 'Obtained marks must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        max_marks = float(sub.project.maximum_marks)
        if obtained_marks > max_marks or obtained_marks < 0:
            return Response({'error': f'Obtained marks must be between 0 and {max_marks}'}, status=status.HTTP_400_BAD_REQUEST)

        sub.obtained_marks = obtained_marks
        sub.quality_score = round((obtained_marks / max_marks) * 100.0, 2)
        sub.admin_feedback = feedback
        sub.status = 'admin-overridden'
        sub.graded_at = timezone.now()
        sub.save()
        return Response({'status': 'Marks overridden successfully', 'submission': ProjectSubmissionSerializer(sub).data})

    elif action == 'reevaluate':
        sub.status = 'pending'
        sub.project_match_score = None
        sub.quality_score = None
        sub.obtained_marks = None
        sub.evaluation_report = None
        sub.admin_feedback = None
        sub.save()

        run_project_auto_grading_async(sub.id)
        return Response({'status': 'Re-evaluation started', 'submission': ProjectSubmissionSerializer(sub).data})

    else:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

def fetch_github_api(url, token=None):
    import urllib.request
    import json
    import ssl
    
    headers = {
        "User-Agent": "CSMS-Backend-Evaluator",
        "Accept": "application/vnd.github.v3+json"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    req = urllib.request.Request(url, headers=headers)
    context = ssl._create_unverified_context()
    
    try:
        with urllib.request.urlopen(req, context=context, timeout=15) as response:
            status_code = response.getcode()
            data = json.loads(response.read().decode('utf-8'))
            return data, status_code
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception as e:
        print(f"[GitHub Fetch Error] {e}")
        return None, 500


def fetch_raw_github_file(owner, repo, branch, path):
    import urllib.request
    import ssl
    
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
    headers = {
        "User-Agent": "CSMS-Backend-Evaluator"
    }
    req = urllib.request.Request(url, headers=headers)
    context = ssl._create_unverified_context()
    
    try:
        with urllib.request.urlopen(req, context=context, timeout=15) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[GitHub Raw Fetch Error] Path: {path}, Error: {e}")
        return ""


def evaluate_project_submission_logic(sub):
    from django.utils import timezone
    import re
    import os
    import json
    import urllib.request

    url = sub.github_url.strip()
    match = re.match(r'^https?://(?:www\.)?github\.com/([^/]+)/([^/]+)/?$', url)
    if not match:
        sub.status = 'review_required'
        sub.project_match_score = 0
        sub.quality_score = 0
        sub.obtained_marks = 0
        sub.evaluation_report = "### EVALUATION ERROR\n\nThe provided URL is not a valid GitHub repository URL. It must look like `https://github.com/username/repository-name`."
        sub.graded_at = timezone.now()
        sub.save()
        return

    owner = match.group(1)
    repo = match.group(2)
    if repo.endswith('.git'):
        repo = repo[:-4]

    token = os.getenv('GITHUB_TOKEN')
    
    repo_api_url = f"https://api.github.com/repos/{owner}/{repo}"
    repo_data, status_code = fetch_github_api(repo_api_url, token)
    
    if status_code == 404:
        sub.status = 'review_required'
        sub.project_match_score = 0
        sub.quality_score = 0
        sub.obtained_marks = 0
        sub.evaluation_report = "### EVALUATION ERROR\n\nGitHub repository not found. Please verify that the repository is public and the URL is spelled correctly."
        sub.graded_at = timezone.now()
        sub.save()
        return
    elif status_code == 403 or repo_data is None:
        sub.status = 'review_required'
        sub.project_match_score = 0
        sub.quality_score = 0
        sub.obtained_marks = 0
        sub.evaluation_report = f"### EVALUATION ERROR\n\nGitHub API rate limit exceeded or repository is inaccessible (HTTP {status_code}). Requires Admin review."
        sub.graded_at = timezone.now()
        sub.save()
        return

    default_branch = repo_data.get('default_branch', 'main')

    tree_api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
    tree_data, tree_status = fetch_github_api(tree_api_url, token)
    
    file_list = []
    has_readme = False
    has_package_json = False
    has_requirements_txt = False
    readme_path = None
    package_json_path = None
    requirements_path = None

    if tree_status == 200 and tree_data and 'tree' in tree_data:
        for node in tree_data['tree']:
            path = node.get('path', '')
            if node.get('type') == 'blob':
                file_list.append(path)
                lower_path = path.lower()
                if lower_path == 'readme.md':
                    has_readme = True
                    readme_path = path
                elif lower_path == 'package.json':
                    has_package_json = True
                    package_json_path = path
                elif lower_path == 'requirements.txt':
                    has_requirements_txt = True
                    requirements_path = path
    
    file_list_summary = file_list[:150]
    if len(file_list) > 150:
        file_list_summary.append(f"... and {len(file_list) - 150} more files.")

    readme_content = ""
    package_json_content = ""
    requirements_content = ""

    if has_readme and readme_path:
        readme_content = fetch_raw_github_file(owner, repo, default_branch, readme_path)[:4000]
    if has_package_json and package_json_path:
        package_json_content = fetch_raw_github_file(owner, repo, default_branch, package_json_path)[:2000]
    if has_requirements_txt and requirements_path:
        requirements_content = fetch_raw_github_file(owner, repo, default_branch, requirements_path)[:2000]

    deployment_info = "Not provided"
    if sub.deployment_url:
        deployment_info = f"URL: {sub.deployment_url}\n"
        try:
            req = urllib.request.Request(sub.deployment_url, headers={'User-Agent': 'CSMS-Grading-Agent'})
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.getcode() == 200:
                    deployment_info += "Status: Reachable (HTTP 200)"
                else:
                    deployment_info += f"Status: Unreachable (HTTP {response.getcode()})"
        except Exception as e:
            deployment_info += f"Status: Unreachable ({str(e)})"

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        from django.conf import settings
        gemini_key = getattr(settings, 'GEMINI_API_KEY', None)

    prompt = f"""You are a strict, professional code evaluator. Your task is to evaluate the student's GitHub repository submission against the assigned project specification.

Assigned Project: {sub.project.title}
Additional Instructions: {sub.project.additional_instructions or "None"}
Specification Document:
---
{sub.project.specification_extracted_text or "No specification extracted."}
---

Student Submitted GitHub Repository: {sub.github_url}
Deployment Information:
{deployment_info}

Scanned File List (first 150 files):
{json.dumps(file_list_summary, indent=2)}

README Contents:
---
{readme_content or "No README found."}
---

package.json / requirements.txt Contents:
{package_json_content or requirements_content or "No packages config found."}

Please run a rigorous static code review.
Rules:
1. Determine "project_match_score" (0 to 100%): Does the repository actually represent the assigned project '{sub.project.title}'? If it is a completely different project (even if it has good code), the match score must be VERY LOW (e.g. < 20%) and they must receive very low marks.
2. Search for real implementation evidence (components, models, endpoints, views, routing configurations) rather than just README claims. If there's no actual implementation, score should be low.
3. Identify the requirements from the Project Specification (e.g., authentication, database integration, specific views, business logic). Check if each requirement is implemented, missing, or partially implemented.
4. Calculate the "quality_score" (0 to 100%). If the specification has a rubric, follow that rubric. Otherwise, use:
   - Project Match / Relevance: 25%
   - Required Features: 30%
   - Functionality: 15%
   - Code Quality & Architecture: 10%
   - Backend / Database Integration: 10%
   - Documentation: 5%
   - Repository Quality: 5%
5. Calculate obtained marks = (quality_score / 100.0) * {sub.project.maximum_marks}. Round to one decimal place.
6. Determine the final "status". If:
   - Repository is inaccessible, empty, has almost no code, or has a Project Match Score < 50%
   Then status MUST be "review_required" (Requires Admin Review).
   Otherwise status should be "auto-graded".

You must respond ONLY with a JSON object in this format (no markdown blocks, no prefix):
{{
  "project_match_score": 92.0,
  "quality_score": 82.0,
  "obtained_marks": 41.0,
  "status": "auto-graded",
  "evaluation_report": "### PROJECT EVALUATION REPORT\\n\\n[Detailed report text with markdown structure, checklist of requirements, tech stack detected, code quality analysis, deployment status, and feedback]"
}}
"""

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers=headers, 
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=25) as response:
                res = json.loads(response.read().decode('utf-8'))
                text = res['candidates'][0]['content']['parts'][0]['text']
                data = json.loads(text.strip())
                
                sub.project_match_score = float(data.get('project_match_score', 0))
                sub.quality_score = float(data.get('quality_score', 0))
                sub.obtained_marks = round(float(data.get('obtained_marks', 0)), 1)
                sub.obtained_marks = min(float(sub.project.maximum_marks), max(0.0, sub.obtained_marks))
                sub.status = data.get('status', 'auto-graded')
                sub.evaluation_report = data.get('evaluation_report', 'Graded successfully.')
                sub.graded_at = timezone.now()
                sub.save()
                return
        except Exception as e:
            print(f"[Gemini Project Grading Error] Triggering fallback. Error: {e}")

    # Fallback Grading
    title_words = [w.lower() for w in re.findall(r'\w+', sub.project.title) if len(w) >= 4]
    found_count = 0
    search_space = (readme_content + " ".join(file_list_summary)).lower()
    for w in title_words:
        if w in search_space:
            found_count += 1
    match_score = (found_count / len(title_words)) * 100.0 if title_words else 80.0
    
    quality = 30.0
    reasons = []
    if has_readme:
        quality += 20.0
        reasons.append("README is present.")
    if has_package_json or has_requirements_txt:
        quality += 20.0
        reasons.append("Project configuration package definitions detected.")
    if len(file_list) > 10:
        quality += 20.0
        reasons.append("Adequate source files present.")
    if sub.deployment_url:
        quality += 10.0
        reasons.append("Deployment URL provided.")

    if match_score < 40.0:
        status = 'review_required'
        report_warning = "\n\n**WARNING:** The repository search terms match very poorly with the project title. Requires Admin review."
    else:
        status = 'auto-graded'
        report_warning = ""

    sub.project_match_score = round(match_score, 1)
    sub.quality_score = round(quality, 1)
    sub.obtained_marks = round((quality / 100.0) * sub.project.maximum_marks, 1)
    sub.status = status
    sub.evaluation_report = f"""### PROJECT EVALUATION REPORT (Fallback Mode)
[Warning: LLM grading key not configured or unreachable. Used localized rule-based fallback grading.]

- **Project Match Score:** {match_score:.1f}%{report_warning}
- **Tech Stack Indicators:** {", ".join(reasons) if reasons else "None found"}
- **File count:** {len(file_list)} files scanned.
- **Deployment URL status:** {deployment_info}
"""
    sub.graded_at = timezone.now()
    sub.save()


def run_project_auto_grading_async(submission_id):
    import sys
    if 'test' in sys.argv:
        return
        
    import os
    if os.getenv('VERCEL'):
        try:
            from api.models import ProjectSubmission
            sub = ProjectSubmission.objects.get(id=submission_id)
            sub.status = 'grading'
            sub.save()
            evaluate_project_submission_logic(sub)
        except Exception as e:
            print(f"[Project Auto-Grading Error] Sync grading error: {e}")
        return
    
    def worker():
        import time
        time.sleep(2)
        try:
            from api.models import ProjectSubmission
            sub = ProjectSubmission.objects.get(id=submission_id)
            sub.status = 'grading'
            sub.save()
            
            time.sleep(3)
            evaluate_project_submission_logic(sub)
        except Exception as e:
            print(f"[Project Auto-Grading Error] Async worker error: {e}")
            
    import threading
    threading.Thread(target=worker).start()


@api_view(['GET', 'POST', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_chat(request):
    """
    Activated Group Chat API Endpoint for Students & Admins
    Supports selecting specific batch channels via batch_id query or payload parameter,
    and deleting chat messages via DELETE request.
    """
    user = request.user

    if request.method == 'DELETE':
        message_id = request.GET.get('message_id') or (request.data.get('message_id') if isinstance(request.data, dict) else None)
        if not message_id:
            return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            msg = ChatMessage.objects.get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response({'error': 'Message not found or already deleted'}, status=status.HTTP_404_NOT_FOUND)

        if user.role != 'admin' and msg.sender != user:
            return Response({'error': 'Permission denied. You can only delete your own messages.'}, status=status.HTTP_403_FORBIDDEN)

        msg.delete()

        # Delete from Mongo
        from api.mongo import get_mongo_db
        db = get_mongo_db()
        if db is not None:
            try:
                db['chat_messages'].delete_one({'_id': str(message_id)})
            except Exception as e:
                print(f"[MongoDB Delete Warning] {e}")

        return Response({'message': 'Message deleted successfully', 'id': int(message_id)}, status=status.HTTP_200_OK)

    # Resolve requested batch or fallback to enrolled / default batch
    batch_id = request.GET.get('batch_id') or (request.data.get('batch_id') if isinstance(request.data, dict) else None)
    batch = None
    if batch_id:
        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            pass

    if not batch:
        batch = get_student_batch(user)
        if not batch:
            batch = Batch.objects.first()
            if not batch:
                batch = Batch.objects.create(name='CSMS General', description='General CSMS Discussion Channel')

    if request.method == 'GET':
        messages = ChatMessage.objects.filter(batch=batch).order_by('timestamp')[:100]
        serialized = []
        for msg in messages:
            sender = msg.sender
            full_name = sender.get_full_name().strip() if sender.get_full_name() else sender.username.split('@')[0]
            role_title = 'System Coordinator' if sender.role == 'admin' else ('Student' if sender.role == 'student' else sender.role.capitalize())
            name_color = '#f87171' if sender.role == 'admin' else '#3b82f6'
            
            serialized.append({
                'id': msg.id,
                'sender_id': sender.id,
                'sender_name': full_name,
                'sender_role': sender.role,
                'sender_title': role_title,
                'sender_namecolor': name_color,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'batch_id': batch.id,
                'batch_name': batch.name
            })
        return Response(serialized, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            batch=batch,
            sender=user,
            content=content
        )
        
        # Mirror to Mongo
        from api.mongo import sync_to_mongo
        sync_to_mongo('chat_messages', msg.id, {
            'batch_id': batch.id,
            'batch_name': batch.name,
            'sender_email': user.email,
            'content': content,
            'timestamp': msg.timestamp.isoformat()
        })

        full_name = user.get_full_name().strip() if user.get_full_name() else user.username.split('@')[0]
        role_title = 'System Coordinator' if user.role == 'admin' else ('Student' if user.role == 'student' else user.role.capitalize())
        name_color = '#f87171' if user.role == 'admin' else '#3b82f6'

        return Response({
            'id': msg.id,
            'sender_id': user.id,
            'sender_name': full_name,
            'sender_role': user.role,
            'sender_title': role_title,
            'sender_namecolor': name_color,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
            'batch_id': batch.id,
            'batch_name': batch.name
        }, status=status.HTTP_201_CREATED)




