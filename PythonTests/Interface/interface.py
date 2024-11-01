# Enhanced navigation with keyboard shortcuts

import streamlit as st
import json
import os
from datetime import datetime
import streamlit.components.v1 as components
from urllib.parse import urlparse, parse_qs

st.title("Coup Game Testing Visualization")

# Initialize session state for current_step
if 'current_step' not in st.session_state:
    st.session_state.current_step = 0

# Load Test Steps
@st.cache_data
def load_test_steps(file_path):
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist")
        return []
    with open(file_path, "r") as f:
        steps = [json.loads(line) for line in f if line.strip()]
    # Remove duplicate entries
    unique_steps = []
    seen = set()
    for step in steps:
        step_tuple = (step['step'], step['timestamp'], json.dumps(step.get('game_state')))
        if step_tuple not in seen:
            seen.add(step_tuple)
            unique_steps.append(step)
    return unique_steps

test_steps = load_test_steps("test_steps.json")

if not test_steps:
    st.write("No test steps found. Please run the tests first.")
    st.stop()

# Sidebar Controls
st.sidebar.header("Controls")

step_names = [step["step"] for step in test_steps]
current_step = st.session_state.current_step

st.sidebar.markdown(f"**Step {current_step + 1} of {len(test_steps)}**")

# Display Current Step
if test_steps and current_step < len(test_steps):
    step_info = test_steps[current_step]
    st.header(f"Step {current_step + 1}: {step_info['step']}")
    st.write(f"**Timestamp:** {step_info['timestamp']}")
else:
    st.error("No test steps available to display")
    step_info = {}

# Display Game State
if step_info.get("game_state"):
    st.subheader("Game State")
    st.json(step_info["game_state"])
else:
    st.write("No game state information available for this step.")

# Navigation Buttons with Shortcuts
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Previous Step") or st.session_state.get('left_arrow'):
        if st.session_state.current_step > 0:
            st.session_state.current_step -= 1
            st.session_state.left_arrow = False
            st.rerun()

with col2:
    if st.button("Next Step") or st.session_state.get('right_arrow'):
        if st.session_state.current_step < len(test_steps) - 1:
            st.session_state.current_step += 1
            st.session_state.right_arrow = False
            st.rerun()

with col3:
    st.write("Use the buttons or arrow keys to navigate through the test steps.")

# Keyboard Shortcuts
# Inject JavaScript to capture key presses and send them to Streamlit
components.html(
    """
    <script>
    document.addEventListener('keydown', function(event) {
        if(event.key === "ArrowLeft") {
            // Send a POST request to Streamlit's server with the key information
            fetch("/_stcore/serialize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({"left_arrow": true})
            });
        }
        if(event.key === "ArrowRight") {
            fetch("/_stcore/serialize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({"right_arrow": true})
            });
        }
    });
    </script>
    """,
    height=0,
)

# Update session state based on key presses
if st.session_state.get('left_arrow'):
    if st.session_state.current_step > 0:
        st.session_state.current_step -= 1
        st.session_state.left_arrow = False
        st.rerun()

if st.session_state.get('right_arrow'):
    if st.session_state.current_step < len(test_steps) - 1:
        st.session_state.current_step += 1
        st.session_state.right_arrow = False
        st.rerun()

# Optional: Display All Steps in a Table
with st.expander("Show All Steps"):
    st.write("## All Test Steps")
    st.write("### Overview")
    for idx, step in enumerate(test_steps):
        st.write(f"**Step {idx + 1}:** {step['step']} at {step['timestamp']}")
        if step.get("game_state"):
            st.json(step["game_state"])

# Optional: Filter Steps by Keyword
st.sidebar.header("Filter Steps")
search_term = st.sidebar.text_input("Search by keyword")

if search_term:
    filtered_steps = [step for step in test_steps if search_term.lower() in step["step"].lower()]
    st.subheader(f"Filtered Steps containing '{search_term}'")
    for idx, step in enumerate(filtered_steps):
        st.write(f"**Step {idx + 1}:** {step['step']} at {step['timestamp']}")
        if step.get("game_state"):
            st.json(step["game_state"])
else:
    st.write("")