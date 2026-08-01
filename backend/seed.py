import os
import django
from django.utils import timezone
from datetime import date, timedelta, datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ssms_backend.settings')
django.setup()

from django.core.management import call_command
call_command('migrate', verbosity=0)

from api.models import (
    User, Batch, BatchEnrollment, Task, Submission, 
    LeetcodeChallenge, LeetcodeSubmission, StudyNote, 
    MockDriveResult, AttendanceLog, LeaveRequest, ChatMessage,
    PlacementCompany, PlacementRound, PlacementResource
)

def seed_db():
    print("Seeding CSMS Database (Global & Administrative Data Only)...")
    
    # 1. Clean existing data directly in MongoDB Atlas
    from api.mongo import get_mongo_db
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        mongo_db['users'].delete_many({})
        mongo_db['batches'].delete_many({})
        mongo_db['batch_enrollments'].delete_many({})
        mongo_db['tasks'].delete_many({})
        mongo_db['submissions'].delete_many({})
        mongo_db['attendance_logs'].delete_many({})
        mongo_db['leave_requests'].delete_many({})
        mongo_db['chat_messages'].delete_many({})
        mongo_db['mock_results'].delete_many({})
        mongo_db['leetcode_submissions'].delete_many({})
        mongo_db['study_notes'].delete_many({})
        mongo_db['placement_companies'].delete_many({})
        mongo_db['placement_rounds'].delete_many({})
        mongo_db['placement_resources'].delete_many({})
        print("Wiped all old MongoDB Atlas collections directly.")

    # 2. Clean SQLite memory
    ChatMessage.objects.all().delete()
    LeaveRequest.objects.all().delete()
    AttendanceLog.objects.all().delete()
    MockDriveResult.objects.all().delete()
    StudyNote.objects.all().delete()
    Submission.objects.all().delete()
    Task.objects.all().delete()
    BatchEnrollment.objects.all().delete()
    Batch.objects.all().delete()
    User.objects.all().delete()
    PlacementResource.objects.all().delete()
    PlacementRound.objects.all().delete()
    PlacementCompany.objects.all().delete()

    # 2. Create Admin Account
    admin = User.objects.create_superuser(
        username="chethan@mits.ac.in",
        email="chethan@mits.ac.in",
        password="Chethan@21",
        first_name="Chethan",
        last_name="",
        role='admin'
    )
    print("Created Admin Account: chethan@mits.ac.in")

    # 3. Create Standard Available Training Batches
    batches_data = [
        {
            "name": "Python",
            "description": "Python Full Stack Development, Django REST Framework, Data Structures & Algorithms",
            "trainer": "Dr. K. Sharma",
            "seats": 60
        },
        {
            "name": "Java",
            "description": "Java Enterprise Edition, Spring Boot Microservices, Object-Oriented Architecture",
            "trainer": "Prof. R. Varma",
            "seats": 60
        },
        {
            "name": "Data Analytics",
            "description": "Data Science, SQL Aggregations, Pandas, Tableau Visualization & Machine Learning Fundamentals",
            "trainer": "Ananya Roy",
            "seats": 50
        },
        {
            "name": "C Programming",
            "description": "Core C Programming, Pointers, Memory Management, Linked Lists & Systems Fundamentals",
            "trainer": "M. Venkatesh",
            "seats": 60
        },
        {
            "name": "DBMS",
            "description": "Database Management Systems, Relational Algebra, SQL Optimization & NoSQL MongoDB",
            "trainer": "S. Swaminathan",
            "seats": 60
        },
        {
            "name": "Full Stack",
            "description": "MERN & Python Full Stack Web Application Development, React.js & API Design",
            "trainer": "Dr. K. Sharma",
            "seats": 50
        },
        {
            "name": "AI & ML",
            "description": "Artificial Intelligence, Deep Learning with PyTorch, Computer Vision & NLP Models",
            "trainer": "P. Deshmukh",
            "seats": 40
        }
    ]

    for b in batches_data:
        Batch.objects.create(
            name=b["name"],
            description=b["description"],
            trainer_name=b["trainer"],
            max_seats=b["seats"]
        )
    print(f"Seeded {len(batches_data)} Available Training Batches.")

    # 4. Create Global Study Notes
    global_notes = [
        {
            "title": "Python Cheat Sheet & DSA Reference Guide",
            "summary": "Comprehensive Python 3 syntax overview, standard library functions, big-O complexity reference, time/space trade-offs, and dictionary operations for technical coding rounds.",
            "file_url": "https://drive.google.com/file/d/1demo-python-cheat-sheet/view",
            "category": "global"
        },
        {
            "title": "Core SQL Queries & Database Indexing Handbook",
            "summary": "Guide covering SQL JOINs, GROUP BY HAVING, window functions, Subqueries, Index creation, and Transaction Isolation levels.",
            "file_url": "https://drive.google.com/file/d/1demo-sql-handbook/view",
            "category": "global"
        },
        {
            "title": "System Design & REST API Best Practices",
            "summary": "Reference guide detailing RESTful architecture, HTTP status codes, authentication tokens (JWT), CORS headers, rate limiting, and backend API design patterns.",
            "file_url": "https://drive.google.com/file/d/1demo-system-design/view",
            "category": "global"
        },
        {
            "title": "Quantitative Aptitude & Logical Reasoning Formulas",
            "summary": "Handbook containing shortcuts for Time & Work, Speed Distance, Permutations & Combinations, Probability, Cryptarithmetic, and Logical Reasoning puzzles.",
            "file_url": "https://drive.google.com/file/d/1demo-aptitude-guide/view",
            "category": "global"
        }
    ]

    for note in global_notes:
        StudyNote.objects.create(
            title=note["title"],
            summary=note["summary"],
            file_url=note["file_url"],
            category=note["category"],
            uploaded_by=admin
        )
    print("Seeded Global Study Notes.")

    # 5. Create Placement Companies, Rounds & Resources
    print("Seeding Placement Prep Guides...")
    companies_data = [
        {
            "name": "Accenture",
            "desc": "Accenture is a global professional services company with leading capabilities in digital, cloud and security, delivering strategy and consulting, technology and operations services.",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=AC",
            "rounds": [
                {
                    "num": 1, "title": "Cognitive & Technical Assessment",
                    "desc": "Online test comprising Analytical Reasoning, Numerical Ability, English Ability, Pseudo Code, and Common Applications and MS Office MCQs.",
                    "resource": {
                        "title": "Accenture Pseudo Code & Aptitude Question Bank",
                        "url": "https://drive.google.com/file/d/1demo-accenture-r1/view",
                        "questions": "1. What will be the output of the following pseudo code?\n   ```\n   Set Integer a = 5, b = 10, c = 2\n   c = (a ^ b) + c\n   Print c\n   ```\n   *Answer: 17*\n\n2. Logical Puzzle: A train 150m long passes a pole in 15 seconds. Find speed of train in km/hr.\n   *Answer: 36 km/hr*"
                    }
                },
                {
                    "num": 2, "title": "Coding Round",
                    "desc": "2 hands-on coding problems testing arrays, strings, bit manipulation, and dynamic programming basics.",
                    "resource": {
                        "title": "Accenture Top 10 Coding Problems",
                        "url": "https://drive.google.com/file/d/1demo-accenture-r2/view",
                        "questions": "1. **Rat Count House Problem**:\n   Calculate total food required for R rats and return the minimum number of houses needed from an array.\n\n2. **Binary String Operations**:\n   Evaluate a binary string consisting of 'A' (AND), 'B' (OR), 'C' (XOR) and return the integer result."
                    }
                },
                {
                    "num": 3, "title": "Communication & HR Interview",
                    "desc": "Automated spoken English test assessing pronunciation, fluency, listening comprehension, followed by technical/HR panel interview.",
                    "resource": {
                        "title": "Accenture HR Interview Questions & Tips",
                        "url": "https://drive.google.com/file/d/1demo-accenture-r3/view",
                        "questions": "1. Tell me about a time you had a disagreement with a team member during a project. How did you resolve it?\n2. Why do you want to join Accenture over other IT consulting firms?"
                    }
                }
            ]
        },
        {
            "name": "TCS",
            "desc": "Tata Consultancy Services is a global leader in IT services, consulting, and business solutions, part of India's largest conglomerate, the Tata Group.",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=TC",
            "rounds": [
                {
                    "num": 1, "title": "TCS NQT National Qualifier Test",
                    "desc": "Conducted on TCS iON platform. Aptitude, Verbal, Logic, and 2 advanced coding questions.",
                    "resource": {
                        "title": "TCS NQT Advanced Coding Questions",
                        "url": "https://drive.google.com/file/d/1demo-tcs-r1/view",
                        "questions": "1. **Factorial of large numbers**:\n   Write a function to return the factorial of a large number and print it as a string.\n2. **Array Rotation**:\n   Rotate an array of N integers to the right by K positions."
                    }
                },
                {
                    "num": 2, "title": "Technical Interview",
                    "desc": "Technical panel review. Questions on basic data structures (Stack, Queue, LinkedList, Tree), DBMS, C programming.",
                    "resource": {
                        "title": "TCS Core Technical Questions Bank",
                        "url": "https://drive.google.com/file/d/1demo-tcs-r2/view",
                        "questions": "1. What is the difference between Call by Value and Call by Reference in C?\n2. Explain static variables in Python/Java. How are they allocated memory?\n3. Define ACID properties in database management."
                    }
                },
                {
                    "num": 3, "title": "Managerial & HR Panel",
                    "desc": "Assess integrity, company loyalty, educational history check, and relocation confirmation.",
                    "resource": {
                        "title": "TCS Behavioral & HR Guide",
                        "url": "https://drive.google.com/file/d/1demo-tcs-r3/view",
                        "questions": "1. Who is the founder of the Tata Group? Talk about the philanthropic work of Tata.\n2. Are you ready to sign a service bond agreement if required by the company?"
                    }
                }
            ]
        },
        {
            "name": "Infosys",
            "desc": "Infosys Limited is a global leader in next-generation digital services and consulting, serving clients in over 50 countries.",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=IN",
            "rounds": [
                {
                    "num": 1, "title": "Infosys InfyTQ / Online Test",
                    "desc": "Quantitative Aptitude, Cryptarithmetic puzzles, Python/Java coding challenges, and DBMS questions.",
                    "resource": {
                        "title": "Infosys Cryptarithmetic & Math Prep",
                        "url": "https://drive.google.com/file/d/1demo-infosys-r1/view",
                        "questions": "1. **Cryptarithmetic Solve**:\n   SEND + MORE = MONEY. Find the digit value of each letter.\n   *Answer: S=9, E=5, N=6, D=7, M=1, O=0, R=8, Y=2*\n2. Quantitative Logic: Work, Time and Pipes systems calculations."
                    }
                },
                {
                    "num": 2, "title": "Technical Interview",
                    "desc": "Interviewer asks you to write code in a shareable editor. Focuses on string parsing, list queries, OOP syntax.",
                    "resource": {
                        "title": "Infosys Code Editor Prep List",
                        "url": "https://drive.google.com/file/d/1demo-infosys-r2/view",
                        "questions": "1. Write a function to check if two strings are anagrams of each other.\n2. What is abstract class vs interface? Write syntax examples in Java/Python.\n3. Explain primary keys, foreign keys, and unique constraints."
                    }
                },
                {
                    "num": 3, "title": "HR Interview",
                    "desc": "Final communication check, certificates checklist review, and career alignment discussion.",
                    "resource": {
                        "title": "Infosys HR Interview Questions",
                        "url": "https://drive.google.com/file/d/1demo-infosys-r3/view",
                        "questions": "1. Why do you want to start your professional journey with Infosys?\n2. Tell me about your hobbies. What do you do outside academics?"
                    }
                }
            ]
        },
        {
            "name": "Wipro",
            "desc": "Wipro Limited is a leading technology services and consulting company focused on building innovative solutions.",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=WI",
            "rounds": [
                {
                    "num": 1, "title": "Wipro Elite National Talent Hunt",
                    "desc": "Aptitude, logical analysis, verbal English grammar, basic coding test, and a business essay writing section.",
                    "resource": {
                        "title": "Wipro Essay Writing & Code Practice",
                        "url": "https://drive.google.com/file/d/1demo-wipro-r1/view",
                        "questions": "- Essay Writing: Write a 200-word essay on 'The impact of AI on job creation'.\n- Coding: Find prime numbers in a given range."
                    }
                },
                {
                    "num": 2, "title": "Technical Interview",
                    "desc": "Review of coding structures, pointer operations, array indexes, and database schemas.",
                    "resource": {
                        "title": "Wipro Technical Panel Questions",
                        "url": "https://drive.google.com/file/d/1demo-wipro-r2/view",
                        "questions": "1. Explain pointer variables in C. What is a dangling pointer?\n2. What is the difference between DELETE and TRUNCATE in SQL?"
                    }
                },
                {
                    "num": 3, "title": "HR Interview",
                    "desc": "Relocation confirmation, shifts agreement review, and basic onboarding queries.",
                    "resource": {
                        "title": "Wipro HR Onboarding Guide",
                        "url": "https://drive.google.com/file/d/1demo-wipro-r3/view",
                        "questions": "1. Are you willing to work in night shifts or rotating shifts?\n2. Tell me about your college achievements."
                    }
                }
            ]
        }
    ]

    for comp in companies_data:
        company_obj = PlacementCompany.objects.create(
            name=comp["name"],
            description=comp["desc"],
            logo_url=comp["logo"]
        )
        for rnd in comp["rounds"]:
            round_obj = PlacementRound.objects.create(
                company=company_obj,
                round_num=rnd["num"],
                title=rnd["title"],
                description=rnd["desc"]
            )
            PlacementResource.objects.create(
                placement_round=round_obj,
                title=rnd["resource"]["title"],
                file_url=rnd["resource"]["url"],
                sample_questions=rnd["resource"]["questions"]
            )

    print("CSMS Database clean seeding completed successfully!")

if __name__ == '__main__':
    seed_db()
