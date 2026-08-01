from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from api.models import (
    User, Batch, BatchEnrollment, Task, Submission,
    LeetcodeChallenge, LeetcodeSubmission, StudyNote,
    MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage,
    PlacementCompany, PlacementRound, PlacementResource, PasswordResetOTP,
    Project, ProjectSubmission
)
from api.mongo import sync_to_mongo, delete_from_mongo

# 1. User
@receiver(post_save, sender=User)
def sync_user_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'username': instance.username,
        'email': instance.email,
        'password': instance.password,
        'first_name': instance.first_name,
        'last_name': instance.last_name,
        'roll_number': instance.roll_number,
        'phone_number': instance.phone_number,
        'role': instance.role,
        'github_url': instance.github_url,
        'linkedin_url': instance.linkedin_url,
        'portfolio_url': instance.portfolio_url,
        'hackerrank_url': instance.hackerrank_url,
        'last_seen': str(instance.last_seen) if instance.last_seen else None
    }
    sync_to_mongo('users', instance.id, data)


@receiver(post_delete, sender=User)
def delete_user_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('users', instance.id)


# 2. Batch
@receiver(post_save, sender=Batch)
def sync_batch_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'name': instance.name,
        'description': instance.description,
        'trainer_name': instance.trainer_name,
        'max_seats': instance.max_seats,
        'created_at': str(instance.created_at)
    }
    sync_to_mongo('batches', instance.id, data)

@receiver(post_delete, sender=Batch)
def delete_batch_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('batches', instance.id)


# 3. BatchEnrollment
@receiver(post_save, sender=BatchEnrollment)
def sync_enrollment_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'student_id': instance.student_id,
        'student_username': instance.student.username if instance.student else None,
        'batch_id': instance.batch_id,
        'batch_name': instance.batch.name if instance.batch else None,
        'status': instance.status,
        'joined_at': str(instance.joined_at),
        'requested_at': str(instance.requested_at) if getattr(instance, 'requested_at', None) else None,
        'approved_at': str(instance.approved_at) if getattr(instance, 'approved_at', None) else None,
        'approved_by_id': instance.approved_by_id if getattr(instance, 'approved_by_id', None) else None
    }
    sync_to_mongo('batch_enrollments', instance.id, data)

@receiver(post_delete, sender=BatchEnrollment)
def delete_enrollment_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('batch_enrollments', instance.id)


# 4. Task
@receiver(post_save, sender=Task)
def sync_task_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'batch_id': instance.batch_id,
        'title': instance.title,
        'description': instance.description,
        'due_date': str(instance.due_date),
        'created_at': str(instance.created_at)
    }
    sync_to_mongo('tasks', instance.id, data)

@receiver(post_delete, sender=Task)
def delete_task_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('tasks', instance.id)


# 5. Submission
@receiver(post_save, sender=Submission)
def sync_submission_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'task_id': instance.task_id,
        'student_id': instance.student_id,
        'github_url': instance.github_url,
        'submission_type': instance.submission_type,
        'written_answer': instance.written_answer,
        'uploaded_document': instance.uploaded_document.name if instance.uploaded_document else None,
        'extracted_text': instance.extracted_text,
        'quality_score': instance.quality_score,
        'obtained_marks': instance.obtained_marks,
        'evaluation_status': instance.evaluation_status,
        'evaluation_time': str(instance.evaluation_time) if instance.evaluation_time else None,
        'is_approved': instance.is_approved,
        'submitted_at': str(instance.submitted_at),
        'grade': instance.grade,
        'feedback': instance.feedback,
        'graded_at': str(instance.graded_at) if instance.graded_at else None
    }
    sync_to_mongo('submissions', instance.id, data)

@receiver(post_delete, sender=Submission)
def delete_submission_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('submissions', instance.id)


# 6. LeetcodeChallenge
@receiver(post_save, sender=LeetcodeChallenge)
def sync_leetcode_challenge_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'title': instance.title,
        'url': instance.url,
        'day_number': instance.day_number,
        'available_date': str(instance.available_date),
        'deadline': str(instance.deadline),
        'created_at': str(instance.created_at)
    }
    sync_to_mongo('leetcode_challenges', instance.id, data)

@receiver(post_delete, sender=LeetcodeChallenge)
def delete_leetcode_challenge_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('leetcode_challenges', instance.id)


# 7. LeetcodeSubmission
@receiver(post_save, sender=LeetcodeSubmission)
def sync_leetcode_submission_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'challenge_id': instance.challenge_id,
        'student_id': instance.student_id,
        'submission_url': instance.submission_url,
        'status': instance.status,
        'submitted_at': str(instance.submitted_at)
    }
    sync_to_mongo('leetcode_submissions', instance.id, data)

@receiver(post_delete, sender=LeetcodeSubmission)
def delete_leetcode_submission_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('leetcode_submissions', instance.id)


# 8. StudyNote
@receiver(post_save, sender=StudyNote)
def sync_study_note_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'batch_id': instance.batch_id,
        'title': instance.title,
        'summary': instance.summary,
        'uploaded_by_id': instance.uploaded_by_id,
        'category': instance.category,
        'file_url': instance.file_url,
        'date_shared': str(instance.date_shared)
    }
    sync_to_mongo('study_notes', instance.id, data)

@receiver(post_delete, sender=StudyNote)
def delete_study_note_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('study_notes', instance.id)


# 9. MockDriveResult
@receiver(post_save, sender=MockDriveResult)
def sync_mock_result_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'student_id': instance.student_id,
        'test_name': instance.test_name,
        'aptitude_score': instance.aptitude_score,
        'tech_score': instance.tech_score,
        'coding_score': instance.coding_score,
        'tech_hr_score': instance.tech_hr_score,
        'hr_score': instance.hr_score,
        'total_score': instance.total_score,
        'grade': instance.grade,
        'date': str(instance.date)
    }
    sync_to_mongo('mock_results', instance.id, data)

@receiver(post_delete, sender=MockDriveResult)
def delete_mock_result_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('mock_results', instance.id)


# 10. AttendanceLog
@receiver(post_save, sender=AttendanceLog)
def sync_attendance_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'student_id': instance.student_id,
        'date': str(instance.date),
        'check_in': str(instance.check_in) if instance.check_in else None,
        'check_out': str(instance.check_out) if instance.check_out else None,
        'total_time': str(instance.total_time) if instance.total_time else None,
        'status': instance.status
    }
    sync_to_mongo('attendance_logs', instance.id, data)

@receiver(post_delete, sender=AttendanceLog)
def delete_attendance_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('attendance_logs', instance.id)


# 11. LeaveRequest
@receiver(post_save, sender=LeaveRequest)
def sync_leave_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'student_id': instance.student_id,
        'leave_type': instance.leave_type,
        'date': str(instance.date),
        'reason': instance.reason,
        'pdf_url': instance.pdf_url,
        'status': instance.status,
        'admin_response': instance.admin_response,
        'created_at': str(instance.created_at)
    }
    sync_to_mongo('leave_requests', instance.id, data)

@receiver(post_delete, sender=LeaveRequest)
def delete_leave_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('leave_requests', instance.id)


# 12. ChatMessage
@receiver(post_save, sender=ChatMessage)
def sync_chat_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'batch_id': instance.batch_id,
        'sender_id': instance.sender_id,
        'content': instance.content,
        'timestamp': str(instance.timestamp)
    }
    sync_to_mongo('chat_messages', instance.id, data)

@receiver(post_delete, sender=ChatMessage)
def delete_chat_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('chat_messages', instance.id)


# 13. PlacementCompany
@receiver(post_save, sender=PlacementCompany)
def sync_company_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'name': instance.name,
        'description': instance.description,
        'logo_url': instance.logo_url
    }
    sync_to_mongo('placement_companies', instance.id, data)

@receiver(post_delete, sender=PlacementCompany)
def delete_company_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('placement_companies', instance.id)


# 14. PlacementRound
@receiver(post_save, sender=PlacementRound)
def sync_round_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'company_id': instance.company_id,
        'round_num': instance.round_num,
        'title': instance.title,
        'description': instance.description
    }
    sync_to_mongo('placement_rounds', instance.id, data)

@receiver(post_delete, sender=PlacementRound)
def delete_round_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('placement_rounds', instance.id)


# 15. PlacementResource
@receiver(post_save, sender=PlacementResource)
def sync_resource_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'placement_round_id': instance.placement_round_id,
        'title': instance.title,
        'file_url': instance.file_url,
        'sample_questions': instance.sample_questions
    }
    sync_to_mongo('placement_resources', instance.id, data)

@receiver(post_delete, sender=PlacementResource)
def delete_resource_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('placement_resources', instance.id)


# 16. PasswordResetOTP
@receiver(post_save, sender=PasswordResetOTP)
def sync_otp_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'email': instance.email,
        'otp_hash': instance.otp_hash,
        'created_at': str(instance.created_at) if instance.created_at else None,
        'expires_at': str(instance.expires_at) if instance.expires_at else None,
        'attempts': instance.attempts,
        'is_verified': instance.is_verified,
        'is_used': instance.is_used
    }
    sync_to_mongo('password_reset_otps', instance.id, data)

@receiver(post_delete, sender=PasswordResetOTP)
def delete_otp_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('password_reset_otps', instance.id)


# 17. Project
@receiver(post_save, sender=Project)
def sync_project_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'title': instance.title,
        'assigned_batch_id': instance.assigned_batch_id,
        'assigned_batch_name': instance.assigned_batch.name if instance.assigned_batch else None,
        'specification_file': instance.specification_file.name if instance.specification_file else None,
        'specification_filename': instance.specification_filename,
        'specification_extracted_text': instance.specification_extracted_text,
        'additional_instructions': instance.additional_instructions,
        'maximum_marks': instance.maximum_marks,
        'start_date': str(instance.start_date),
        'deadline': str(instance.deadline),
        'created_at': str(instance.created_at) if instance.created_at else None,
        'updated_at': str(instance.updated_at) if instance.updated_at else None
    }
    sync_to_mongo('projects', instance.id, data)

@receiver(post_delete, sender=Project)
def delete_project_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('projects', instance.id)


# 18. ProjectSubmission
@receiver(post_save, sender=ProjectSubmission)
def sync_project_submission_to_mongo(sender, instance, **kwargs):
    data = {
        'id': instance.id,
        'student_id': instance.student_id,
        'student_name': instance.student.get_full_name() or instance.student.username,
        'student_roll': instance.student.roll_number,
        'project_id': instance.project_id,
        'project_title': instance.project.title if instance.project else None,
        'github_url': instance.github_url,
        'deployment_url': instance.deployment_url,
        'submitted_at': str(instance.submitted_at) if instance.submitted_at else None,
        'project_match_score': instance.project_match_score,
        'quality_score': instance.quality_score,
        'obtained_marks': instance.obtained_marks,
        'evaluation_report': instance.evaluation_report,
        'status': instance.status,
        'admin_feedback': instance.admin_feedback,
        'graded_at': str(instance.graded_at) if instance.graded_at else None
    }
    sync_to_mongo('project_submissions', instance.id, data)

@receiver(post_delete, sender=ProjectSubmission)
def delete_project_submission_from_mongo(sender, instance, **kwargs):
    delete_from_mongo('project_submissions', instance.id)
