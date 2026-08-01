import os
import pymongo
import time
import threading
from django.conf import settings

_mongo_client = None
_mongo_db = None
_last_restore_time = 0
RESTORE_THROTTLE_SECONDS = 15
_is_restoring = False
_restore_lock = threading.Lock()

def restore_from_mongo_async(force=False):
    """Run MongoDB restore asynchronously in a daemon background thread without blocking the HTTP request."""
    global _is_restoring
    if _is_restoring:
        return

    def _bg_worker():
        global _is_restoring
        with _restore_lock:
            _is_restoring = True
            try:
                restore_from_mongo(force=force)
            except Exception as err:
                print(f"[MongoDB Async Restore Warning] {err}")
            finally:
                _is_restoring = False

    t = threading.Thread(target=_bg_worker, daemon=True)
    t.start()

def create_mongo_indexes(db):
    try:
        db['users'].create_index([('email', 1)], unique=True, sparse=True)
        db['users'].create_index([('username', 1)], unique=True)
        db['users'].create_index([('role', 1)])
        db['batch_enrollments'].create_index([('student_id', 1)])
        db['batch_enrollments'].create_index([('batch_id', 1)])
        db['batch_enrollments'].create_index([('status', 1)])
        db['tasks'].create_index([('batch_id', 1)])
        db['tasks'].create_index([('due_date', 1)])
        db['submissions'].create_index([('student_id', 1)])
        db['submissions'].create_index([('task_id', 1)])
        db['leetcode_submissions'].create_index([('student_id', 1)])
        db['leetcode_submissions'].create_index([('challenge_id', 1)])
        db['attendance_logs'].create_index([('student_id', 1)])
        db['attendance_logs'].create_index([('date', 1)])
        db['leave_requests'].create_index([('student_id', 1)])
        db['chat_messages'].create_index([('batch_id', 1)])
        db['chat_messages'].create_index([('timestamp', 1)])
        db['password_reset_otps'].create_index([('email', 1)])
        db['projects'].create_index([('assigned_batch_id', 1)])
        db['project_submissions'].create_index([('student_id', 1)])
        db['project_submissions'].create_index([('project_id', 1)])
        print("[MongoDB] Indexes verified/created successfully.")
    except Exception as e:
        print(f"[MongoDB Error] Failed to create indexes: {e}")

def get_mongo_db():
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        uri = getattr(settings, 'MONGODB_URI', os.getenv('MONGODB_URI'))
        if not uri:
            uri = "mongodb+srv://balija-chethan:Chethan%402107@cluster0.dvawyze.mongodb.net/csms_db?retryWrites=true&w=majority"
        
        try:
            _mongo_client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
            _mongo_db = _mongo_client.get_database('csms_db')
            print("[MongoDB] Successfully connected to MongoDB Atlas (csms_db)")
            create_mongo_indexes(_mongo_db)
        except Exception as e:
            print(f"[MongoDB Error] Connection to MongoDB Atlas failed: {e}")
            return None
    return _mongo_db


def update_sync_meta():
    """Update the global last_write timestamp in MongoDB to notify other instances of updates."""
    db = get_mongo_db()
    if db is not None:
        try:
            db['sync_meta'].replace_one({'_id': 'last_write'}, {'timestamp': time.time()}, upsert=True)
        except Exception as e:
            print(f"[MongoDB Error] Failed to update sync_meta: {e}")


def sync_to_mongo(collection_name, doc_id, data):
    """Save or update a document in a MongoDB collection."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        data['_id'] = str(doc_id)
        db[collection_name].replace_one({'_id': str(doc_id)}, data, upsert=True)
        update_sync_meta()
    except Exception as e:
        print(f"[MongoDB Error] Failed to sync document to {collection_name}: {e}")


def delete_from_mongo(collection_name, doc_id):
    """Delete a document from a MongoDB collection."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        db[collection_name].delete_one({'_id': str(doc_id)})
        update_sync_meta()
    except Exception as e:
        print(f"[MongoDB Error] Failed to delete document from {collection_name}: {e}")


def get_all_from_mongo(collection_name):
    """Retrieve all documents from a MongoDB collection."""
    db = get_mongo_db()
    if db is None:
        return []
    try:
        return list(db[collection_name].find({}))
    except Exception as e:
        print(f"[MongoDB Error] Failed to fetch from {collection_name}: {e}")
        return []


def restore_from_mongo(force=False):
    """Restore all data from MongoDB Atlas into active Django ORM models on startup/login."""
    global _last_restore_time
    now = time.time()
    
    # Throttle requests: Only check MongoDB for updates if it has been at least 15 seconds since the last check/restore.
    if not force and _last_restore_time > 0 and (now - _last_restore_time) < RESTORE_THROTTLE_SECONDS:
        return

    import sys
    if 'test' in sys.argv:
        return

    db = get_mongo_db()
    if db is None:
        return

    # 0. Sync Metadata Check
    try:
        meta = db['sync_meta'].find_one({'_id': 'last_write'})
        last_write_time = meta.get('timestamp', 0) if meta else 0
    except Exception as e:
        print(f"[MongoDB Error] Failed to fetch sync_meta timestamp: {e}")
        last_write_time = 0

    if not force and _last_restore_time > 0 and last_write_time <= _last_restore_time:
        # SQLite is already up-to-date with MongoDB
        # Update local tracking time to avoid checking again for 15 seconds
        _last_restore_time = now
        return

    try:
        from api.models import (
            User, Batch, BatchEnrollment, Task, Submission,
            LeetcodeChallenge, LeetcodeSubmission, StudyNote,
            MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage,
            PlacementCompany, PlacementRound, PlacementResource, PasswordResetOTP,
            Project, ProjectSubmission
        )
        from datetime import datetime, date, timedelta
        from django.utils import timezone

        def parse_date(date_str):
            if not date_str:
                return None
            try:
                return datetime.strptime(str(date_str).split(' ')[0].split('T')[0], "%Y-%m-%d").date()
            except Exception:
                return None

        def parse_datetime(dt_str):
            if not dt_str:
                return None
            try:
                clean_str = str(dt_str).replace('T', ' ').split('.')[0]
                dt = datetime.strptime(clean_str[:19], "%Y-%m-%d %H:%M:%S")
                return timezone.make_aware(dt)
            except Exception:
                try:
                    dt = datetime.strptime(str(dt_str).split(' ')[0], "%Y-%m-%d")
                    return timezone.make_aware(dt)
                except Exception:
                    return None

        def parse_duration(dur_str):
            if not dur_str:
                return None
            try:
                parts = dur_str.split(':')
                if len(parts) == 3:
                    hours = float(parts[0])
                    minutes = float(parts[1])
                    seconds = float(parts[2])
                    return timedelta(hours=hours, minutes=minutes, seconds=seconds)
            except Exception:
                pass
            return None

        # 1. Restore Users
        mongo_users = list(db['users'].find({}))
        for u in mongo_users:
            try:
                raw_id = u.get('_id') or u.get('id')
                email = u.get('email') or u.get('username')
                username = u.get('username') or email
                if not username:
                    continue
                
                existing = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
                if not existing:
                    user = User(
                        username=username,
                        email=email,
                        first_name=u.get('first_name', ''),
                        last_name=u.get('last_name', ''),
                        roll_number=u.get('roll_number', ''),
                        phone_number=u.get('phone_number', ''),
                        role=u.get('role', 'student'),
                        github_url=u.get('github_url', ''),
                        linkedin_url=u.get('linkedin_url', ''),
                        portfolio_url=u.get('portfolio_url', ''),
                        hackerrank_url=u.get('hackerrank_url', '')
                    )
                    if str(raw_id).isdigit():
                        user.id = int(raw_id)
                    if u.get('password'):
                        pwd = str(u['password'])
                        if pwd.startswith('pbkdf2_') or pwd.startswith('argon2') or pwd.startswith('bcrypt') or pwd.startswith('md5'):
                            user.password = pwd
                        else:
                            user.set_password(pwd)
                    else:
                        user.set_password('password123')
                    user.save()
                else:
                    update_fields = []
                    if u.get('first_name') and existing.first_name != u['first_name']:
                        existing.first_name = u['first_name']
                        update_fields.append('first_name')
                    if u.get('last_name') and existing.last_name != u['last_name']:
                        existing.last_name = u['last_name']
                        update_fields.append('last_name')
                    if u.get('roll_number') and existing.roll_number != u['roll_number']:
                        existing.roll_number = u['roll_number']
                        update_fields.append('roll_number')
                    if u.get('phone_number') and existing.phone_number != u['phone_number']:
                        existing.phone_number = u['phone_number']
                        update_fields.append('phone_number')
                    if u.get('role') and existing.role != u['role']:
                        existing.role = u['role']
                        update_fields.append('role')
                    if u.get('password') and existing.password != u['password']:
                        pwd = str(u['password'])
                        if pwd.startswith('pbkdf2_') or pwd.startswith('argon2') or pwd.startswith('bcrypt') or pwd.startswith('md5'):
                            existing.password = pwd
                        else:
                            existing.set_password(pwd)
                        update_fields.append('password')
                    if update_fields:
                        existing.save(update_fields=update_fields)
            except Exception as user_err:
                print(f"[MongoDB Auto-Restore] Error restoring user {u.get('username')}: {user_err}")

        # 2. Restore Batches
        mongo_batches = list(db['batches'].find({}))
        for b in mongo_batches:
            try:
                raw_id = b.get('_id') or b.get('id')
                b_name = b.get('name')
                if not b_name:
                    continue
                existing = Batch.objects.filter(name=b_name).first()
                if not existing:
                    batch = Batch(
                        name=b_name,
                        description=b.get('description', ''),
                        trainer_name=b.get('trainer_name', 'Senior Instructor'),
                        max_seats=b.get('max_seats', 60),
                        created_at=parse_datetime(b.get('created_at')) or timezone.now()
                    )
                    if str(raw_id).isdigit():
                        batch.id = int(raw_id)
                    batch.save()
            except Exception as batch_err:
                print(f"[MongoDB Auto-Restore] Error restoring batch {b.get('name')}: {batch_err}")

        # 3. Restore BatchEnrollments
        mongo_enrollments = list(db['batch_enrollments'].find({}))
        for e in mongo_enrollments:
            raw_id = e.get('_id') or e.get('id')
            student_id = e.get('student_id')
            batch_id = e.get('batch_id')
            if student_id and batch_id:
                try:
                    student = User.objects.filter(id=student_id).first()
                    batch = Batch.objects.filter(id=batch_id).first()
                    if student and batch:
                        enr = BatchEnrollment.objects.filter(student=student, batch=batch).first()
                        if not enr:
                            enr = BatchEnrollment(
                                student=student,
                                batch=batch,
                                status=e.get('status', 'pending')
                            )
                            if str(raw_id).isdigit():
                                enr.id = int(raw_id)
                        else:
                            enr.status = e.get('status', 'pending')
                        
                        if e.get('approved_by_id'):
                            approved_by_user = User.objects.filter(id=e.get('approved_by_id')).first()
                            if approved_by_user:
                                enr.approved_by = approved_by_user
                        enr.save()
                except Exception:
                    pass

        # 4. Restore Tasks
        mongo_tasks = list(db['tasks'].find({}))
        for t in mongo_tasks:
            raw_id = t.get('_id') or t.get('id')
            batch_id = t.get('batch_id')
            title = t.get('title')
            if batch_id and title:
                try:
                    batch = Batch.objects.filter(id=batch_id).first()
                    if batch and not Task.objects.filter(batch=batch, title=title).exists():
                        due_str = t.get('due_date', str(date.today()))
                        try:
                            parsed_due = datetime.strptime(due_str.split(' ')[0], "%Y-%m-%d").date()
                        except Exception:
                            parsed_due = date.today()
                        task = Task(batch=batch, title=title, description=t.get('description', ''), due_date=parsed_due)
                        if str(raw_id).isdigit():
                            task.id = int(raw_id)
                        task.save()
                except Exception:
                    pass

        # 5. Restore LeetcodeChallenges
        mongo_challenges = list(db['leetcode_challenges'].find({}))
        for lc in mongo_challenges:
            raw_id = lc.get('_id') or lc.get('id')
            title = lc.get('title')
            url = lc.get('url')
            if title and url:
                try:
                    if not LeetcodeChallenge.objects.filter(title=title).exists():
                        avail_str = lc.get('available_date', str(date.today()))
                        dead_str = lc.get('deadline', str(date.today() + timedelta(days=7)))
                        try:
                            parsed_avail = datetime.strptime(avail_str.split(' ')[0], "%Y-%m-%d").date()
                        except Exception:
                            parsed_avail = date.today()

                        try:
                            parsed_dead = timezone.make_aware(datetime.strptime(dead_str.split(' ')[0], "%Y-%m-%d").replace(hour=23, minute=59, second=59))
                        except Exception:
                            parsed_dead = timezone.now() + timedelta(days=7)

                        ch = LeetcodeChallenge(
                            title=title,
                            url=url,
                            day_number=lc.get('day_number', 1),
                            available_date=parsed_avail,
                            deadline=parsed_dead
                        )
                        if str(raw_id).isdigit():
                            ch.id = int(raw_id)
                        ch.save()
                except Exception:
                    pass

        # 6. Restore StudyNotes
        mongo_notes = list(db['study_notes'].find({}))
        for n in mongo_notes:
            raw_id = n.get('_id') or n.get('id')
            title = n.get('title')
            if title and not StudyNote.objects.filter(title=title).exists():
                try:
                    batch_id = n.get('batch_id')
                    batch_obj = Batch.objects.filter(id=batch_id).first() if batch_id else None
                    uploaded_by_id = n.get('uploaded_by_id')
                    uploader = User.objects.filter(id=uploaded_by_id).first() if uploaded_by_id else None
                    note = StudyNote(
                        batch=batch_obj,
                        title=title,
                        summary=n.get('summary', ''),
                        uploaded_by=uploader,
                        category=n.get('category', 'global'),
                        file_url=n.get('file_url', '')
                    )
                    if str(raw_id).isdigit():
                        note.id = int(raw_id)
                    note.save()
                except Exception:
                    pass

        # 7. Restore Placement Prep (Companies, Rounds, Resources)
        mongo_companies = list(db['placement_companies'].find({}))
        for c in mongo_companies:
            comp_name = c.get('name')
            raw_c_id = c.get('_id') or c.get('id')
            if comp_name:
                company_obj = PlacementCompany.objects.filter(name=comp_name).first()
                if not company_obj:
                    company_obj = PlacementCompany(
                        name=comp_name,
                        description=c.get('description', ''),
                        logo_url=c.get('logo_url', '')
                    )
                    if str(raw_c_id).isdigit():
                        company_obj.id = int(raw_c_id)
                    company_obj.save()

        mongo_rounds = list(db['placement_rounds'].find({}))
        for r in mongo_rounds:
            raw_r_id = r.get('_id') or r.get('id')
            company_id = r.get('company_id')
            round_num = r.get('round_num', 1)
            title = r.get('title', '')
            if company_id and title:
                company_obj = PlacementCompany.objects.filter(id=company_id).first()
                if company_obj and not PlacementRound.objects.filter(company=company_obj, round_num=round_num).exists():
                    r_obj = PlacementRound(
                        company=company_obj,
                        round_num=round_num,
                        title=title,
                        description=r.get('description', '')
                    )
                    if str(raw_r_id).isdigit():
                        r_obj.id = int(raw_r_id)
                    r_obj.save()

        mongo_resources = list(db['placement_resources'].find({}))
        for res in mongo_resources:
            raw_res_id = res.get('_id') or res.get('id')
            placement_round_id = res.get('placement_round_id')
            title = res.get('title', '')
            if placement_round_id and title:
                p_round = PlacementRound.objects.filter(id=placement_round_id).first()
                if p_round and not PlacementResource.objects.filter(placement_round=p_round, title=title).exists():
                    res_obj = PlacementResource(
                        placement_round=p_round,
                        title=title,
                        file_url=res.get('file_url', ''),
                        sample_questions=res.get('sample_questions', '')
                    )
                    if str(raw_res_id).isdigit():
                        res_obj.id = int(raw_res_id)
                    res_obj.save()

        # 8. Restore Submissions
        mongo_submissions = list(db['submissions'].find({}))
        for s in mongo_submissions:
            raw_id = s.get('_id') or s.get('id')
            task_id = s.get('task_id')
            student_id = s.get('student_id')
            if task_id and student_id:
                try:
                    task = Task.objects.filter(id=task_id).first()
                    student = User.objects.filter(id=student_id).first()
                    if task and student:
                        sub = Submission.objects.filter(task=task, student=student).first()
                        if not sub:
                            sub = Submission(
                                task=task,
                                student=student,
                                github_url=s.get('github_url'),
                                submission_type=s.get('submission_type', 'written'),
                                written_answer=s.get('written_answer'),
                                extracted_text=s.get('extracted_text'),
                                quality_score=s.get('quality_score'),
                                obtained_marks=s.get('obtained_marks'),
                                evaluation_status=s.get('evaluation_status', 'pending'),
                                evaluation_time=parse_datetime(s.get('evaluation_time')),
                                is_approved=s.get('is_approved', False),
                                grade=s.get('grade'),
                                feedback=s.get('feedback'),
                                graded_at=parse_datetime(s.get('graded_at'))
                            )
                            if s.get('uploaded_document'):
                                sub.uploaded_document = s.get('uploaded_document')
                            if str(raw_id).isdigit():
                                sub.id = int(raw_id)
                        else:
                            sub.github_url = s.get('github_url', sub.github_url)
                            sub.submission_type = s.get('submission_type', sub.submission_type)
                            sub.written_answer = s.get('written_answer', sub.written_answer)
                            sub.extracted_text = s.get('extracted_text', sub.extracted_text)
                            sub.quality_score = s.get('quality_score', sub.quality_score)
                            sub.obtained_marks = s.get('obtained_marks', sub.obtained_marks)
                            sub.evaluation_status = s.get('evaluation_status', sub.evaluation_status)
                            sub.evaluation_time = parse_datetime(s.get('evaluation_time')) or sub.evaluation_time
                            sub.is_approved = s.get('is_approved', sub.is_approved)
                            sub.grade = s.get('grade', sub.grade)
                            sub.feedback = s.get('feedback', sub.feedback)
                            sub.graded_at = parse_datetime(s.get('graded_at')) or sub.graded_at
                            if s.get('uploaded_document'):
                                sub.uploaded_document = s.get('uploaded_document')
                        sub.save()
                        sub_time = parse_datetime(s.get('submitted_at'))
                        if sub_time:
                            Submission.objects.filter(id=sub.id).update(submitted_at=sub_time)
                except Exception:
                    pass

        # 9. Restore LeetcodeSubmissions
        mongo_lc_submissions = list(db['leetcode_submissions'].find({}))
        for ls in mongo_lc_submissions:
            raw_id = ls.get('_id') or ls.get('id')
            challenge_id = ls.get('challenge_id')
            student_id = ls.get('student_id')
            if challenge_id and student_id:
                try:
                    challenge = LeetcodeChallenge.objects.filter(id=challenge_id).first()
                    student = User.objects.filter(id=student_id).first()
                    if challenge and student:
                        sub = LeetcodeSubmission.objects.filter(challenge=challenge, student=student).first()
                        if not sub:
                            sub = LeetcodeSubmission(
                                challenge=challenge,
                                student=student,
                                submission_url=ls.get('submission_url', ''),
                                status=ls.get('status', 'completed')
                            )
                            if str(raw_id).isdigit():
                                sub.id = int(raw_id)
                        else:
                            sub.submission_url = ls.get('submission_url', sub.submission_url)
                            sub.status = ls.get('status', sub.status)
                        sub.save()
                        sub_time = parse_datetime(ls.get('submitted_at'))
                        if sub_time:
                            LeetcodeSubmission.objects.filter(id=sub.id).update(submitted_at=sub_time)
                except Exception:
                    pass

        # 10. Restore MockDriveResults
        mongo_mock_results = list(db['mock_results'].find({}))
        for mr in mongo_mock_results:
            raw_id = mr.get('_id') or mr.get('id')
            student_id = mr.get('student_id')
            if student_id:
                try:
                    student = User.objects.filter(id=student_id).first()
                    if student:
                        res = MockDriveResult.objects.filter(student=student, test_name=mr.get('test_name')).first()
                        if not res:
                            res = MockDriveResult(
                                student=student,
                                test_name=mr.get('test_name'),
                                aptitude_score=mr.get('aptitude_score', 0),
                                tech_score=mr.get('tech_score', 0),
                                coding_score=mr.get('coding_score', 0),
                                tech_hr_score=mr.get('tech_hr_score', 0),
                                hr_score=mr.get('hr_score', 0),
                                total_score=mr.get('total_score', 0),
                                grade=mr.get('grade', 'C'),
                                date=parse_date(mr.get('date')) or date.today()
                            )
                            if str(raw_id).isdigit():
                                res.id = int(raw_id)
                        else:
                            res.aptitude_score = mr.get('aptitude_score', res.aptitude_score)
                            res.tech_score = mr.get('tech_score', res.tech_score)
                            res.coding_score = mr.get('coding_score', res.coding_score)
                            res.tech_hr_score = mr.get('tech_hr_score', res.tech_hr_score)
                            res.hr_score = mr.get('hr_score', res.hr_score)
                            res.total_score = mr.get('total_score', res.total_score)
                            res.grade = mr.get('grade', res.grade)
                            res.date = parse_date(mr.get('date')) or res.date
                        res.save()
                except Exception:
                    pass

        # 11. Restore AttendanceLogs
        mongo_attendance = list(db['attendance_logs'].find({}))
        for al in mongo_attendance:
            raw_id = al.get('_id') or al.get('id')
            student_id = al.get('student_id')
            log_date = parse_date(al.get('date'))
            if student_id and log_date:
                try:
                    student = User.objects.filter(id=student_id).first()
                    if student:
                        log = AttendanceLog.objects.filter(student=student, date=log_date).first()
                        if not log:
                            log = AttendanceLog(
                                student=student,
                                date=log_date,
                                check_in=parse_datetime(al.get('check_in')),
                                check_out=parse_datetime(al.get('check_out')),
                                total_time=parse_duration(al.get('total_time')),
                                status=al.get('status', 'present')
                            )
                            if str(raw_id).isdigit():
                                log.id = int(raw_id)
                        else:
                            log.check_in = parse_datetime(al.get('check_in')) or log.check_in
                            log.check_out = parse_datetime(al.get('check_out')) or log.check_out
                            log.total_time = parse_duration(al.get('total_time')) or log.total_time
                            log.status = al.get('status', log.status)
                        log.save()
                except Exception:
                    pass

        # 12. Restore LeaveRequests
        mongo_leaves = list(db['leave_requests'].find({}))
        for lr in mongo_leaves:
            raw_id = lr.get('_id') or lr.get('id')
            student_id = lr.get('student_id')
            leave_date = parse_date(lr.get('date'))
            if student_id and leave_date:
                try:
                    student = User.objects.filter(id=student_id).first()
                    if student:
                        leave = LeaveRequest.objects.filter(student=student, date=leave_date).first()
                        if not leave:
                            leave = LeaveRequest(
                                student=student,
                                leave_type=lr.get('leave_type'),
                                date=leave_date,
                                reason=lr.get('reason', ''),
                                pdf_url=lr.get('pdf_url', ''),
                                status=lr.get('status', 'pending'),
                                admin_response=lr.get('admin_response', '')
                            )
                            if str(raw_id).isdigit():
                                leave.id = int(raw_id)
                        else:
                            leave.leave_type = lr.get('leave_type', leave.leave_type)
                            leave.reason = lr.get('reason', leave.reason)
                            leave.pdf_url = lr.get('pdf_url', leave.pdf_url)
                            leave.status = lr.get('status', leave.status)
                            leave.admin_response = lr.get('admin_response', leave.admin_response)
                        leave.save()
                        created_time = parse_datetime(lr.get('created_at'))
                        if created_time:
                            LeaveRequest.objects.filter(id=leave.id).update(created_at=created_time)
                except Exception:
                    pass

        # 13. Restore ChatMessages
        mongo_chat = list(db['chat_messages'].find({}))
        for cm in mongo_chat:
            raw_id = cm.get('_id') or cm.get('id')
            batch_id = cm.get('batch_id')
            sender_id = cm.get('sender_id')
            if batch_id and sender_id:
                try:
                    batch = Batch.objects.filter(id=batch_id).first()
                    sender = User.objects.filter(id=sender_id).first()
                    if batch and sender:
                        chat_time = parse_datetime(cm.get('timestamp'))
                        msg = None
                        if str(raw_id).isdigit():
                            msg = ChatMessage.objects.filter(id=int(raw_id)).first()
                        if not msg:
                            msg = ChatMessage(
                                batch=batch,
                                sender=sender,
                                content=cm.get('content', '')
                            )
                            if str(raw_id).isdigit():
                                msg.id = int(raw_id)
                            msg.save()
                            if chat_time:
                                ChatMessage.objects.filter(id=msg.id).update(timestamp=chat_time)
                except Exception:
                    pass

        # 14. Restore PasswordResetOTPs
        try:
            mongo_otps = list(db['password_reset_otps'].find({}))
            for o in mongo_otps:
                raw_id = o.get('_id') or o.get('id')
                email = o.get('email')
                if email:
                    try:
                        otp_record = PasswordResetOTP.objects.filter(email=email).first()
                        if not otp_record:
                            otp_record = PasswordResetOTP(
                                email=email,
                                otp_hash=o.get('otp_hash'),
                                expires_at=parse_datetime(o.get('expires_at')) or timezone.now(),
                                attempts=o.get('attempts', 0),
                                is_verified=o.get('is_verified', False),
                                is_used=o.get('is_used', False)
                            )
                            if str(raw_id).isdigit():
                                otp_record.id = int(raw_id)
                            otp_record.save()
                            created_time = parse_datetime(o.get('created_at'))
                            if created_time:
                                PasswordResetOTP.objects.filter(id=otp_record.id).update(created_at=created_time)
                    except Exception:
                        pass
        except Exception:
            pass

        # 15. Restore Projects
        try:
            mongo_projects = list(db['projects'].find({}))
            for p in mongo_projects:
                raw_id = p.get('_id') or p.get('id')
                batch_id = p.get('assigned_batch_id')
                title = p.get('title')
                if batch_id and title:
                    try:
                        batch = Batch.objects.filter(id=batch_id).first()
                        if batch:
                            proj = Project.objects.filter(id=int(raw_id)).first() if str(raw_id).isdigit() else Project.objects.filter(assigned_batch=batch, title=title).first()
                            if not proj:
                                proj = Project(
                                    title=title,
                                    assigned_batch=batch,
                                    specification_filename=p.get('specification_filename'),
                                    specification_extracted_text=p.get('specification_extracted_text'),
                                    additional_instructions=p.get('additional_instructions'),
                                    maximum_marks=p.get('maximum_marks', 100),
                                    start_date=parse_date(p.get('start_date')) or date.today(),
                                    deadline=parse_date(p.get('deadline')) or date.today()
                                )
                                if p.get('specification_file'):
                                    proj.specification_file = p.get('specification_file')
                                if str(raw_id).isdigit():
                                    proj.id = int(raw_id)
                            else:
                                proj.title = title
                                proj.assigned_batch = batch
                                proj.specification_filename = p.get('specification_filename', proj.specification_filename)
                                proj.specification_extracted_text = p.get('specification_extracted_text', proj.specification_extracted_text)
                                proj.additional_instructions = p.get('additional_instructions', proj.additional_instructions)
                                proj.maximum_marks = p.get('maximum_marks', proj.maximum_marks)
                                proj.start_date = parse_date(p.get('start_date')) or proj.start_date
                                proj.deadline = parse_date(p.get('deadline')) or proj.deadline
                                if p.get('specification_file'):
                                    proj.specification_file = p.get('specification_file')
                            proj.save()
                            created_time = parse_datetime(p.get('created_at'))
                            if created_time:
                                Project.objects.filter(id=proj.id).update(created_at=created_time)
                    except Exception as e:
                        print(f"[MongoDB Auto-Restore] Error restoring project: {e}")
        except Exception:
            pass

        # 16. Restore ProjectSubmissions
        try:
            mongo_p_submissions = list(db['project_submissions'].find({}))
            for ps in mongo_p_submissions:
                raw_id = ps.get('_id') or ps.get('id')
                student_id = ps.get('student_id')
                project_id = ps.get('project_id')
                if student_id and project_id:
                    try:
                        student = User.objects.filter(id=student_id).first()
                        project = Project.objects.filter(id=project_id).first()
                        if student and project:
                            sub = ProjectSubmission.objects.filter(project=project, student=student).first()
                            if not sub:
                                sub = ProjectSubmission(
                                    student=student,
                                    project=project,
                                    github_url=ps.get('github_url', ''),
                                    deployment_url=ps.get('deployment_url'),
                                    project_match_score=ps.get('project_match_score'),
                                    quality_score=ps.get('quality_score'),
                                    obtained_marks=ps.get('obtained_marks'),
                                    evaluation_report=ps.get('evaluation_report'),
                                    status=ps.get('status', 'pending'),
                                    admin_feedback=ps.get('admin_feedback'),
                                    graded_at=parse_datetime(ps.get('graded_at'))
                                )
                                if str(raw_id).isdigit():
                                    sub.id = int(raw_id)
                            else:
                                sub.github_url = ps.get('github_url', sub.github_url)
                                sub.deployment_url = ps.get('deployment_url', sub.deployment_url)
                                sub.project_match_score = ps.get('project_match_score', sub.project_match_score)
                                sub.quality_score = ps.get('quality_score', sub.quality_score)
                                sub.obtained_marks = ps.get('obtained_marks', sub.obtained_marks)
                                sub.evaluation_report = ps.get('evaluation_report', sub.evaluation_report)
                                sub.status = ps.get('status', sub.status)
                                sub.admin_feedback = ps.get('admin_feedback', sub.admin_feedback)
                                sub.graded_at = parse_datetime(ps.get('graded_at')) or sub.graded_at
                            sub.save()
                            sub_time = parse_datetime(ps.get('submitted_at'))
                            if sub_time:
                                ProjectSubmission.objects.filter(id=sub.id).update(submitted_at=sub_time)
                    except Exception as e:
                        print(f"[MongoDB Auto-Restore] Error restoring project submission: {e}")
        except Exception:
            pass

        # Update local sync tracking timestamp
        _last_restore_time = last_write_time if last_write_time > 0 else time.time()
        print(f"[MongoDB Auto-Restore] Verified state ({len(mongo_users)} users, {len(mongo_batches)} batches, {len(mongo_notes)} study notes, {len(mongo_companies)} placement companies).")
    except Exception as err:
        print(f"[MongoDB Auto-Restore Error] {err}")
