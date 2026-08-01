import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ssms_backend.settings')
django.setup()

from api.models import (
    User, Batch, BatchEnrollment, Task, Submission, 
    LeetcodeChallenge, LeetcodeSubmission, StudyNote, 
    MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage,
    PlacementCompany, PlacementRound, PlacementResource
)
from api.signals import (
    sync_user_to_mongo, sync_batch_to_mongo, sync_enrollment_to_mongo,
    sync_task_to_mongo, sync_submission_to_mongo, sync_leetcode_challenge_to_mongo,
    sync_leetcode_submission_to_mongo, sync_study_note_to_mongo,
    sync_mock_result_to_mongo, sync_attendance_to_mongo, sync_leave_to_mongo,
    sync_chat_to_mongo, sync_company_to_mongo, sync_round_to_mongo,
    sync_resource_to_mongo
)

def full_sync():
    print("Performing Initial MongoDB Atlas Sync across all 16 collections...")
    
    for u in User.objects.all(): sync_user_to_mongo(User, u)
    for b in Batch.objects.all(): sync_batch_to_mongo(Batch, b)
    for e in BatchEnrollment.objects.all(): sync_enrollment_to_mongo(BatchEnrollment, e)
    for t in Task.objects.all(): sync_task_to_mongo(Task, t)
    for s in Submission.objects.all(): sync_submission_to_mongo(Submission, s)
    for lc in LeetcodeChallenge.objects.all(): sync_leetcode_challenge_to_mongo(LeetcodeChallenge, lc)
    for ls in LeetcodeSubmission.objects.all(): sync_leetcode_submission_to_mongo(LeetcodeSubmission, ls)
    for sn in StudyNote.objects.all(): sync_study_note_to_mongo(StudyNote, sn)
    for mr in MockDriveResult.objects.all(): sync_mock_result_to_mongo(MockDriveResult, mr)
    for al in AttendanceLog.objects.all(): sync_attendance_to_mongo(AttendanceLog, al)
    for lr in LeaveRequest.objects.all(): sync_leave_to_mongo(LeaveRequest, lr)
    for cm in ChatMessage.objects.all(): sync_chat_to_mongo(ChatMessage, cm)
    for pc in PlacementCompany.objects.all(): sync_company_to_mongo(PlacementCompany, pc)
    for pr in PlacementRound.objects.all(): sync_round_to_mongo(PlacementRound, pr)
    for pres in PlacementResource.objects.all(): sync_resource_to_mongo(PlacementResource, pres)

    print("Initial MongoDB Sync completed successfully!")

if __name__ == '__main__':
    full_sync()
