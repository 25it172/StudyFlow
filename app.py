
import streamlit as st
from datetime import date

st.set_page_config(
    page_title="StudyFlow | Student Planner",
    page_icon="📚",
    layout="wide"
)

if "tasks" not in st.session_state:
    st.session_state.tasks = []

st.markdown("""
<style>
.stApp {
    background-color: #101522;
    color: #f1f5f9;
}
[data-testid="stSidebar"] {
    background-color: #171e2e;
}
h1, h2, h3, p, label {
    color: #f1f5f9;
}
div.stButton > button {
    border-radius: 10px;
}
</style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.title("📘 StudyFlow")
    st.caption("Smart Student Task Planner")
    page = st.radio(
        "Navigation",
        ["Dashboard", "My Tasks", "Add Task"]
    )
    st.divider()
    st.caption("Plan your day. Learn better.")

if page == "Dashboard":
    st.title("Welcome to StudyFlow 👋")
    st.write("Organize your studies and stay on track.")
    total = len(st.session_state.tasks)
    completed = sum(
        task["completed"] for task in st.session_state.tasks
    )
    pending = total - completed

    a, b, c = st.columns(3)
    a.metric("Total Tasks", total)
    b.metric("Completed", completed)
    c.metric("Pending", pending)

    st.subheader("Today's Overview")
    if total == 0:
        st.info("No tasks yet. Go to Add Task to plan your studies.")
    else:
        st.progress(completed / total if total else 0)
        st.write(f"{completed} of {total} tasks completed.")

    st.subheader("Your Tasks")
    for i, task in enumerate(st.session_state.tasks):
        status = "✅" if task["completed"] else "🕒"
        st.write(
            f"{status} **{task['title']}** — "
            f"{task['subject']} | Due: {task['due']}"
        )

elif page == "Add Task":
    st.title("➕ Add a Study Task")
    with st.form("task_form", clear_on_submit=True):
        title = st.text_input("Task name", placeholder="e.g. Revise Python loops")
        subject = st.text_input("Subject", placeholder="e.g. Python")
        due = st.date_input("Due date", value=date.today())
        priority = st.selectbox(
            "Priority", ["High", "Medium", "Low"]
        )
        submitted = st.form_submit_button("Add Task")

        if submitted:
            if title.strip() and subject.strip():
                st.session_state.tasks.append({
                    "title": title.strip(),
                    "subject": subject.strip(),
                    "due": str(due),
                    "priority": priority,
                    "completed": False
                })
                st.success("Task added successfully!")
            else:
                st.warning("Please enter both task name and subject.")

elif page == "My Tasks":
    st.title("📝 My Tasks")
    if not st.session_state.tasks:
        st.info("No tasks available. Add your first study task!")
    else:
        for i, task in enumerate(st.session_state.tasks):
            with st.container(border=True):
                st.write(f"**{task['title']}**")
                st.caption(
                    f"{task['subject']} · Due {task['due']} · "
                    f"Priority: {task['priority']}"
                )
                done = st.checkbox(
                    "Completed",
                    value=task["completed"],
                    key=f"task_{i}"
                )
                st.session_state.tasks[i]["completed"] = done

                if st.button("Delete Task", key=f"delete_{i}"):
                    st.session_state.tasks.pop(i)
                    st.rerun()
