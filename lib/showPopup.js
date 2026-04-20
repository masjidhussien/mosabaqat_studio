const popup = document.getElementsByClassName("popup")[0];
const popupTitle = document.getElementsByClassName("popupTitle")[0];
const popupContent = document.getElementsByClassName("popupContent")[0];
const closePopup = [document.getElementsByClassName("closePopup")[0], document.getElementsByClassName("okPopup")[0], document.getElementsByClassName("cancelPopup")[0]];
const warnAudio = new Audio("../assets/audio/warn.mp3");

closePopup.forEach(closing => {
    closing.onclick = () => {
        warnAudio.pause();
        warnAudio.currentTime = 0;
        setTimeout(() => {
            popup.style.scale = 0;
            popup.style.opacity = 0;
        }, 250);
        setTimeout(() => {
            popupTitle.textContent = "";
            popupContent.textContent = "";
        }, 500)

    }
})
function showPopup(id, type = "alert") {
    popup.classList.remove("hidden")
    return new Promise((resolve) => {
        // 1. Reset/Setup Buttons based on type
        const okBtn = document.getElementsByClassName("okPopup")[0];
        const cancelBtn = document.getElementsByClassName("cancelPopup")[0];

        if (type === "confirm") {
            cancelBtn.style.display = "inline-block"; // Show Cancel
        } else {
            cancelBtn.style.display = "none"; // Hide for alerts
        }

        if (id.startsWith("warn")) {
            setTimeout(() => {
                warnAudio.play();
            }, 200);
        }
        switch (id) {
            default:
                setTimeout(() => {
                    warnAudio.play();
                }, 200);
                popupTitle.textContent = id.startsWith("تنبيه") ? "تنبيه!" : "تحذير!";
                popupTitle.style.color = id.startsWith("تنبيه") ? "orange" : "red"
                popupContent.innerHTML = id.startsWith("تنبيه") ? id.replace("تنبيه:", "").replaceAll("\\n", "</br>") : id.replaceAll("\\n", "</br>");
                setTimeout(() => {
                    popup.style.opacity = 1;
                }, 250);
                popup.style.scale = 1;
                break;
        }
        popup.style.scale = 1;
        setTimeout(() => popup.style.opacity = 1, 50);

        // 4. Capture the user's choice
        okBtn.onclick = () => {
            closePopupInternal();
            resolve(true); // User clicked OK
        };

        cancelBtn.onclick = () => {
            closePopupInternal();
            resolve(false); // User clicked Cancel
        };

        // Helper to close the UI
        function closePopupInternal() {
            
            popup.style.scale = 0;
            popup.style.opacity = 0;
            setTimeout(() => {
                popup.classList.add("hidden")
            }, 500);
            // (Reset audio/text as per your original closePopup code)
        }
    });
}

