from django.urls import path
from api import views

urlpatterns = [
    # Auth & Profile
    path('auth/register/', views.register_student, name='register'),
    path('auth/login/', views.login_student, name='login'),
    path('auth/forgot-password/', views.forgot_password, name='forgot_password'),
    path('auth/verify-otp/', views.verify_otp, name='verify_otp'),
    path('auth/reset-password/', views.reset_password, name='reset_password'),
    path('student/profile/', views.student_profile, name='profile'),
    
    # Student Operations
    path('student/dashboard/', views.student_dashboard, name='dashboard'),
    path('student/checkin/', views.student_checkin, name='checkin'),
    path('student/tasks/', views.student_tasks, name='tasks'),
    path('student/leetcode/', views.student_leetcode, name='leetcode'),
    path('student/notes/', views.student_notes, name='notes'),
    path('student/grades/', views.student_grades, name='grades'),
    path('student/leaderboard/', views.student_leaderboard, name='leaderboard'),
    path('student/leaves/', views.student_leaves, name='leaves'),
    path('student/chat/', views.student_chat, name='chat'),
    path('student/attendance/', views.get_attendance_log, name='attendance_log'),
    path('student/placement-prep/', views.get_placement_prep, name='placement_prep'),
    path('student/heartbeat/', views.student_heartbeat, name='heartbeat'),

    # Admin Operations
    path('admin/stats/', views.admin_dashboard_stats, name='admin_stats'),
    path('admin/pending-students/', views.admin_pending_students, name='admin_pending_students'),
    path('admin/allocate-batch/', views.admin_allocate_batch, name='admin_allocate_batch'),
    path('admin/create-task/', views.admin_create_task, name='admin_create_task'),
    path('admin/submissions/', views.admin_get_submissions, name='admin_submissions'),
    path('admin/grade-submission/', views.admin_grade_submission, name='admin_grade_submission'),
    path('admin/leaves/', views.admin_get_leaves, name='admin_get_leaves'),
    path('admin/resolve-leave/', views.admin_resolve_leave, name='admin_resolve_leave'),
    path('admin/attendance/', views.admin_get_attendance, name='admin_get_attendance'),
    path('admin/create-leetcode-challenge/', views.admin_create_leetcode_challenge, name='admin_create_leetcode_challenge'),
    path('admin/bulk-create-leetcode/', views.admin_bulk_create_leetcode, name='admin_bulk_create_leetcode'),
    path('admin/create-batch/', views.admin_create_batch, name='admin_create_batch'),

    # Admin Extended Operations
    path('admin/notes/create/', views.admin_create_study_note, name='admin_create_note'),
    path('admin/notes/delete/', views.admin_delete_study_note, name='admin_delete_note'),
    path('admin/mock-results/', views.admin_get_mock_results, name='admin_get_mock_results'),
    path('admin/mock-results/create/', views.admin_create_mock_result, name='admin_create_mock_result'),
    path('admin/company/create/', views.admin_create_company, name='admin_create_company'),
    path('admin/placement-round/create/', views.admin_create_placement_round, name='admin_create_placement_round'),
    path('admin/placement-resource/create/', views.admin_create_placement_resource, name='admin_create_placement_resource'),
    path('admin/placement-resource/<int:resource_id>/update/', views.admin_update_placement_resource, name='admin_update_placement_resource'),
    path('admin/placement-resource/<int:resource_id>/delete/', views.admin_delete_placement_resource, name='admin_delete_placement_resource'),
    path('admin/users/', views.admin_get_users, name='admin_get_users'),
    path('admin/users/create/', views.admin_create_student, name='admin_create_user'),
    path('admin/batch/<int:batch_id>/', views.admin_manage_batch, name='admin_manage_batch'),
    path('admin/user/<int:user_id>/', views.admin_manage_user, name='admin_manage_user'),
    path('admin/remove-student-batch/', views.admin_remove_student_batch, name='admin_remove_student_batch'),
    path('admin/task/<int:task_id>/', views.admin_manage_task, name='admin_manage_task'),

    # Batch Selection & Onboarding Flow
    path('batches/', views.get_batches, name='get_batches'),
    path('batch/request/', views.request_batch_join, name='request_batch'),
    path('student/enrollment/', views.get_student_enrollment, name='student_enrollment'),
    path('admin/pending-requests/', views.admin_pending_batch_requests, name='admin_pending_requests'),
    path('admin/approve/<int:enrollment_id>/', views.admin_approve_batch_request, name='admin_approve_request'),
    path('admin/reject/<int:enrollment_id>/', views.admin_reject_batch_request, name='admin_reject_request'),
    path('admin/change-password/', views.admin_change_password, name='admin_change_password'),
    
    # Projects Endpoints
    path('admin/create-project/', views.admin_create_project, name='admin_create_project'),
    path('admin/projects/', views.admin_get_projects, name='admin_get_projects'),
    path('admin/project/<int:project_id>/', views.admin_manage_project, name='admin_manage_project'),
    path('admin/project-submissions/', views.admin_get_project_submissions, name='admin_get_project_submissions'),
    path('admin/grade-project-submission/', views.admin_grade_project_submission, name='admin_grade_project_submission'),
    path('student/projects/', views.student_projects, name='student_projects'),
]



