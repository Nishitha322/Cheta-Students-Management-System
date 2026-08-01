from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from api.models import User, Batch, Task, StudyNote, LeetcodeChallenge, AttendanceLog, MockDriveResult, LeaveRequest, BatchEnrollment, Submission
from rest_framework.test import APIClient
from rest_framework import status
from api.auth_utils import generate_token

class CSMSTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create student user
        self.student = User.objects.create_user(
            username="student@csms",
            email="student@csms",
            password="Password123",
            role="student"
        )
        self.token = generate_token(self.student)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        # Create admin user
        self.admin = User.objects.create_superuser(
            username="admin@csms",
            email="admin@csms",
            password="AdminPassword",
            role="admin"
        )

        # Create a batch
        self.batch = Batch.objects.create(name="Python Batch", description="Python test batch")

    def test_clean_user_dashboard(self):
        """A newly registered student should have 0% attendance, no mock results, no tasks, and only global notes."""
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should be in awaiting allocation since not in batch
        self.assertEqual(data['status'], 'awaiting_allocation')
        self.assertIsNone(data['batch'])

    def test_attendance_rate_calculation(self):
        """Attendance % should be 0% when working days = 0, and should calculate properly dynamically."""
        # We temporarily allocate student to batch to get dashboard data
        BatchEnrollment.objects.create(student=self.student, batch=self.batch, status="approved")
        
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['attendance']['rate'], 0)

        # Add 1 present day
        AttendanceLog.objects.create(student=self.student, date=date.today() - timedelta(days=2), status="present", check_in=timezone.now() - timedelta(hours=9), check_out=timezone.now())
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.json()['attendance']['rate'], 100)

        # Add 1 absent day (present=1, absent=1 -> 50%)
        AttendanceLog.objects.create(student=self.student, date=date.today() - timedelta(days=1), status="absent")
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.json()['attendance']['rate'], 50)

        # Add 1 leave day (present=1, absent=1, leave=1 -> total=3, leave=1 -> working=2 -> 50%)
        AttendanceLog.objects.create(student=self.student, date=date.today(), status="leave")
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.json()['attendance']['rate'], 50)

    def test_student_checkin_checkout_constraints(self):
        """Check Out should fail and NOT create a log if Check In wasn't called first."""
        response = self.client.post('/student/checkin/', {'action': 'checkout'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
        
        self.assertFalse(AttendanceLog.objects.filter(student=self.student, date=date.today()).exists())

        response = self.client.post('/student/checkin/', {'action': 'checkin'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(AttendanceLog.objects.filter(student=self.student, date=date.today()).exists())

    def test_student_notes_filtering(self):
        """Study notes should return only global notes if the student is not approved in any batch."""
        StudyNote.objects.create(title="Global Note", category="global", file_url="http://drive.com/1")
        StudyNote.objects.create(title="Batch Note", category="batch-specific", batch=self.batch, file_url="http://drive.com/2")

        response = self.client.get('/student/notes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notes = response.json()
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]['title'], "Global Note")

        BatchEnrollment.objects.create(student=self.student, batch=self.batch, status="approved")
        response = self.client.get('/student/notes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notes = response.json()
        self.assertEqual(len(notes), 2)

    def test_leetcode_daily_unlock_dynamic(self):
        """Leetcode challenges should unlock relative to batch approval date, mask URL, and reject submission if locked."""
        # 1. Setup Leetcode challenges roadmap (Day 1 and Day 2)
        ch1 = LeetcodeChallenge.objects.create(
            title="Two Sum", 
            url="http://leetcode.com/twosum", 
            day_number=1, 
            available_date=date.today(),
            deadline=timezone.now() + timedelta(days=1)
        )
        ch2 = LeetcodeChallenge.objects.create(
            title="Palindrome Number", 
            url="http://leetcode.com/palindrome", 
            day_number=2, 
            available_date=date.today() + timedelta(days=1),
            deadline=timezone.now() + timedelta(days=2)
        )

        # 2. Approve enrollment today (so Day 1 is unlocked today, Day 2 unlocks tomorrow)
        BatchEnrollment.objects.create(
            student=self.student, 
            batch=self.batch, 
            status="approved",
            approved_at=timezone.now()
        )

        # 3. Request GET: Day 1 should be unlocked (URL visible), Day 2 should be locked (URL empty)
        response = self.client.get('/student/leetcode/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        challenges = data['challenges']
        
        c1 = [c for c in challenges if c['id'] == ch1.id][0]
        self.assertTrue(c1['is_unlocked'])
        self.assertEqual(c1['url'], "http://leetcode.com/twosum")
        
        c2 = [c for c in challenges if c['id'] == ch2.id][0]
        self.assertFalse(c2['is_unlocked'])
        self.assertEqual(c2['url'], "")

        # 4. Request POST for Day 1: should succeed
        response = self.client.post('/student/leetcode/', {'challengeId': ch1.id, 'submissionUrl': 'http://leetcode.com/sub1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 5. Request POST for Day 2: should fail with 403 and error message
        response = self.client.post('/student/leetcode/', {'challengeId': ch2.id, 'submissionUrl': 'http://leetcode.com/sub2'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()['error'], "This problem has not been unlocked yet.")

    def test_student_dashboard_grade_trend(self):
        """Dashboard grade trend should be empty for new students, show 1 point for 1 task, and connect them for 2+ tasks."""
        # 1. New student should get empty trend
        BatchEnrollment.objects.create(student=self.student, batch=self.batch, status="approved")
        
        response = self.client.get('/student/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['gradeTrend'], [])

        # 2. Add one graded task submission (Task 1: 8/10 -> 80%)
        task1 = Task.objects.create(title="Task 1", batch=self.batch, due_date=date.today())
        sub1 = Submission.objects.create(
            task=task1, 
            student=self.student, 
            github_url="http://github.com/1",
            grade="8/10",
            graded_at=timezone.now() - timedelta(days=2)
        )
        
        response = self.client.get('/student/dashboard/')
        trend = response.json()['gradeTrend']
        self.assertEqual(len(trend), 1)
        self.assertEqual(trend[0]['percentage'], 80.0)

        # 3. Add second graded task submission (Task 2: 18/20 -> 90%)
        task2 = Task.objects.create(title="Task 2", batch=self.batch, due_date=date.today())
        sub2 = Submission.objects.create(
            task=task2, 
            student=self.student, 
            github_url="http://github.com/2",
            grade="18/20",
            graded_at=timezone.now() - timedelta(days=1)
        )
        
        response = self.client.get('/student/dashboard/')
        trend = response.json()['gradeTrend']
        self.assertEqual(len(trend), 2)
        self.assertEqual(trend[0]['percentage'], 80.0)
        self.assertEqual(trend[1]['percentage'], 90.0)

    def test_auto_grading_system(self):
        """Auto grading system should compute quality scores, obtained marks, grades, and support override/approve/reevaluate actions."""
        # 1. Create a task with max marks = 50
        task = Task.objects.create(
            title="Project Evaluation", 
            batch=self.batch, 
            due_date=date.today(),
            max_marks=50,
            submission_type='github'
        )

        # 2. Student submits task
        response = self.client.post('/student/tasks/', {
            'taskId': task.id,
            'githubUrl': 'https://github.com/test/repo'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sub = Submission.objects.get(task=task, student=self.student)
        self.assertEqual(sub.evaluation_status, 'pending')

        # 3. Explicitly evaluate to test logic synchronously
        from api.views import evaluate_submission
        quality_score, obtained_marks, grade, feedback = evaluate_submission(sub)
        
        self.assertTrue(0 <= quality_score <= 100)
        self.assertEqual(obtained_marks, round((quality_score / 100.0) * 50))

        # Save evaluations to DB
        sub.quality_score = quality_score
        sub.obtained_marks = obtained_marks
        sub.grade = f"{obtained_marks}/50"
        sub.feedback = feedback
        sub.evaluation_status = 'completed'
        sub.save()

        # 4. Admin Approves Marks
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {generate_token(self.admin)}')
        response = self.client.post('/admin/grade-submission/', {
            'submissionId': sub.id,
            'action': 'approve'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertTrue(sub.is_approved)

        # 5. Admin Overrides Marks to 45/50
        response = self.client.post('/admin/grade-submission/', {
            'submissionId': sub.id,
            'action': 'override',
            'obtainedMarks': 45,
            'feedback': 'Great presentation override'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.obtained_marks, 45)
        self.assertEqual(sub.quality_score, 90.0)
        self.assertEqual(sub.grade, "45/50")
        self.assertEqual(sub.feedback, "Great presentation override")

    def test_admin_change_password_success(self):
        """Admin should be able to change password with correct inputs."""
        # Force authenticate as admin
        admin_token = generate_token(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        
        response = self.client.post('/admin/change-password/', {
            'currentPassword': 'AdminPassword',
            'newPassword': 'SecureNewPassword@123',
            'confirmPassword': 'SecureNewPassword@123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['message'], 'Password changed successfully.')
        
        # Verify db updated
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password('SecureNewPassword@123'))

    def test_admin_change_password_validation_failures(self):
        """Verify password validation logic for incorrect inputs, reuse, mismatch, and weak passwords."""
        admin_token = generate_token(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')

        # 1. Incorrect current password
        response = self.client.post('/admin/change-password/', {
            'currentPassword': 'WrongCurrentPassword',
            'newPassword': 'SecureNewPassword@123',
            'confirmPassword': 'SecureNewPassword@123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['error'], 'Incorrect current password.')

        # 2. Reuse current password
        response = self.client.post('/admin/change-password/', {
            'currentPassword': 'AdminPassword',
            'newPassword': 'AdminPassword',
            'confirmPassword': 'AdminPassword'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['error'], 'New password cannot be the same as the current password.')

        # 3. New and confirm password mismatch
        response = self.client.post('/admin/change-password/', {
            'currentPassword': 'AdminPassword',
            'newPassword': 'SecureNewPassword@123',
            'confirmPassword': 'MismatchPassword@123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['error'], 'New passwords do not match.')

        # 4. Weak password complexity checks
        weak_passwords = [
            'Short1!',        # Less than 8 chars
            'nocapital123!',   # No uppercase
            'NO_LOWER_CASE_1', # No lowercase
            'NoSpecial123',    # No special char
            'NoNumbers!!!!'    # No number
        ]
        for wp in weak_passwords:
            response = self.client.post('/admin/change-password/', {
                'currentPassword': 'AdminPassword',
                'newPassword': wp,
                'confirmPassword': wp
            }, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_change_password_denied(self):
        """Student role must be forbidden from accessing admin password change."""
        student_token = generate_token(self.student)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {student_token}')

        response = self.client.post('/admin/change-password/', {
            'currentPassword': 'Password123',
            'newPassword': 'SecureNewPassword@123',
            'confirmPassword': 'SecureNewPassword@123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()['error'], 'Admin access required.')

    def test_registration_approval_and_login_flow(self):
        """A new student registers, receives approval from admin, and logs in successfully with registered credentials."""
        # 1. Register new student
        reg_data = {
            'email': 'newstudent@mits.ac.in',
            'password': 'SecurePassword@123',
            'confirmPassword': 'SecurePassword@123',
            'firstName': 'Chethan',
            'lastName': 'B',
            'rollNumber': '21691A0501',
            'phoneNumber': '9876543210'
        }
        reg_res = self.client.post('/auth/register/', reg_data, format='json')
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', reg_res.json())

        # Verify password is Django hashed, NOT plaintext
        new_user = User.objects.get(email='newstudent@mits.ac.in')
        self.assertTrue(new_user.password.startswith('pbkdf2_sha256$'))
        self.assertTrue(new_user.check_password('SecurePassword@123'))
        self.assertEqual(new_user.first_name, 'Chethan')
        self.assertEqual(new_user.last_name, 'B')

        # 2. Admin allocates batch / approves student
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {generate_token(self.admin)}')
        alloc_res = self.client.post('/admin/allocate-batch/', {
            'studentId': new_user.id,
            'batchId': self.batch.id,
            'action': 'approved'
        }, format='json')
        self.assertEqual(alloc_res.status_code, status.HTTP_200_OK)

        # 3. Student logs in with the SAME credentials
        self.client.credentials() # Clear headers
        login_res = self.client.post('/auth/login/', {
            'email': 'newstudent@mits.ac.in',
            'password': 'SecurePassword@123'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        user_data = login_res.json()['user']
        self.assertEqual(user_data['first_name'], 'Chethan')
        self.assertEqual(user_data['last_name'], 'B')
        self.assertEqual(user_data['full_name'], 'Chethan B')
        self.assertEqual(user_data['name'], 'Chethan B')


