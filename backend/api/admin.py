from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from api.models import (
    User, Batch, BatchEnrollment, Task, Submission, 
    LeetcodeChallenge, LeetcodeSubmission, StudyNote, 
    MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage
)

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'first_name', 'last_name', 'roll_number', 'role']
    fieldsets = UserAdmin.fieldsets + (
        ('Student Profile Information', {'fields': (
            'roll_number', 'phone_number', 'role',
            'github_url', 'linkedin_url', 'portfolio_url', 'hackerrank_url'
        )}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Batch)
admin.site.register(BatchEnrollment)
admin.site.register(Task)
admin.site.register(Submission)
admin.site.register(LeetcodeChallenge)
admin.site.register(LeetcodeSubmission)
admin.site.register(StudyNote)
admin.site.register(MockDriveResult)
admin.site.register(AttendanceLog)
admin.site.register(LeaveRequest)
admin.site.register(ChatMessage)
