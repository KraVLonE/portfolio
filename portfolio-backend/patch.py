with open("app/api/endpoints.py", "r") as f:
    content = f.read()

old_func = """@router.post("/contact", response_model=dict)
async def submit_contact(contact: ContactSubmissionCreate, db: AsyncSession = Depends(get_db)):
    # TODO: Add rate limiting and honeypot validation
    new_submission = ContactSubmission(**contact.model_dump())
    db.add(new_submission)
    await db.commit()
    # TODO: Send notification email
    return {"status": "success", "message": "Message received"}"""

new_func = """@router.post("/contact", response_model=dict)
async def submit_contact(
    contact: ContactSubmissionCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Add rate limiting and honeypot validation
    new_submission = ContactSubmission(**contact.model_dump())
    db.add(new_submission)
    await db.commit()
    
    background_tasks.add_task(
        send_notification_email, 
        contact.name, 
        contact.email, 
        contact.message
    )
    
    return {"status": "success", "message": "Message received"}"""

with open("app/api/endpoints.py", "w") as f:
    f.write(content.replace(old_func, new_func))
