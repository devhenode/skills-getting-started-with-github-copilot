document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimeoutId;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId);
    }

    messageTimeoutId = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
  const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      activitiesList.innerHTML = "";
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <p class="participants-title">Participants</p>
            <div class="participants-content"></div>
          </div>
        `;

        const participantsContent = activityCard.querySelector(".participants-content");

        if (details.participants.length > 0) {
          const list = document.createElement("ul");
          list.className = "participants-list";

          details.participants.forEach((participant) => {
            const listItem = document.createElement("li");

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = participant;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participant-remove";
            removeButton.setAttribute(
              "aria-label",
              `Remove ${participant} from ${name}`
            );
            removeButton.innerHTML = "&times;";
            removeButton.addEventListener("click", () => {
              handleParticipantRemoval(name, participant, removeButton);
            });

            listItem.appendChild(emailSpan);
            listItem.appendChild(removeButton);
            list.appendChild(listItem);
          });

          participantsContent.appendChild(list);
        } else {
          const noParticipantsMessage = document.createElement("p");
          noParticipantsMessage.className = "no-participants";
          noParticipantsMessage.textContent = "Be the first to sign up!";
          participantsContent.appendChild(noParticipantsMessage);
        }

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  async function handleParticipantRemoval(activityName, email, triggerButton) {
    if (triggerButton) {
      triggerButton.disabled = true;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to remove participant.", "error");
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      showMessage("Failed to remove participant. Please try again.", "error");
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
      }
    }
  }

  fetchActivities();
});
