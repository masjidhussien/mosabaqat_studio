window.alert = showPopup
window.confirm = (params) => showPopup(params, "confirm")
const qsContainer = document.getElementById("questionsContainer");
const CATEGORY_MAP = [
    { en: "fiqh", ar: "الفقه" }, { en: "aqida", ar: "العقيدة" },
    { en: "arabic", ar: "اللغة العربية" }, { en: "hadith", ar: "الحديث" },
    { en: "history", ar: "السيرة والتاريخ" }, { en: "tafseer", ar: "التفسير" }
];
const colorMap = {
    "--question-button-color1": "زر 1", "--question-button-color1-chosen": "زر 1 مختار",
    "--question-button-color2": "زر 2", "--question-button-color2-chosen": "زر 2 مختار",
    "--question-button-font-color": "نص الزر", "--question-button-font-color-chosen": "نص مختار",
    "--question-page-background-color": "خلفية الصفحة", "--question-page-option-color": "لون الخيار",
    "--question-page-font-color": "نص الخيار"
};
const IMAGE_KEYS = ["nashat", "list_background", "question_page_background", "choice_background"];
const IMAGE_KEYS_AR = ["شعار النّشاط", "خلفيّة لائحة الأرقام", "خلفيّة صفحة السّؤال", "خلفيّة الخيار"];
let base64Images = {};
// Add this to your window.onload
window.onload = () => {
    initColors();
    initImageSlots();
    initCategoryList();
    loadSession();
    updateCounter();
    loadExistingQuizzes(); // New: Load the dropdown
};

async function loadExistingQuizzes() {
    const select = document.getElementById("nashatSelect");
    try {
        const snapshot = await db.collection("quizzes").get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement("option");
            option.value = doc.id; // The ID (e.g., Math_Quiz)
            option.textContent = data.style?.nashatName || doc.id;
            sessionStorage.setItem(doc.id, JSON.stringify(data));
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Error loading quizzes:", e);
    }
}

function toggleNashatInput(value) {
    const input = document.getElementById("nashatInput");
    const checkBtn = document.getElementById("checkIdBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const status = document.getElementById("idStatus");

    if (value === "new") {
        input.style.display = "block";
        checkBtn.style.display = "block";
        deleteBtn.style.display = "none"; // Hide delete for new
        window.nashatName = input.value;
    } else {
        input.style.display = "none";
        checkBtn.style.display = "none";
        deleteBtn.style.display = "block"; // Show delete for existing
        status.textContent = "";
        const select = document.getElementById("nashatSelect");
        window.nashatName = select.options[select.selectedIndex].text;
        loadQuizData(value);
    }
}
async function loadQuizData(id) {
    let data = JSON.parse(sessionStorage.getItem(id));
    const colorPickercontainer = document.getElementById('colorPickerContainer');
    clearAllQuestions(true);
    data.questions.forEach(question => {
        addQuestion(question);
    })
    let colors = [];
    Object.entries(data.style.colorConfig).forEach(([key, value]) => {
        const div = document.createElement('div');
        div.style = "display:flex; align-items:center; gap:10px;";
        div.innerHTML = `<input type="color" name="${key}" value="${rgbToHex(value)}"> <span>${colorMap[key]}</span>`;
      
        div.querySelector('input').oninput = (e) => {
            document.documentElement.style.setProperty(key, e.target.value);
            saveSession();
            renderPreview();
        };
        colors.push(div);
        
    });
    colors.sort((a, b) => {
        const keys = Object.keys(colorMap);        
        return keys.indexOf(a.children.item(0).name) - keys.indexOf(b.children.item(0).name);
    });
    colorPickercontainer.replaceChildren(...colors);
}
async function deleteExistingQuiz() {
    const select = document.getElementById("nashatSelect");
    const quizId = select.value;
    const quizName = select.options[select.selectedIndex].text;

    if (quizId === "new") return;

    const confirmation = await confirm(`هل أنت متأكد من حذف مسابقة "${quizName}" نهائياً من قاعدة البيانات؟`);

    if (confirmation) {
        try {
            await db.collection("quizzes").doc(quizId).delete();
            alert("✅ تم حذف المسابقة بنجاح.").then(() => {
                window.sessionStorage.clear();
                window.location.reload()
            })

        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("❌ فشل الحذف: " + error.message);
        }
    }
}
function initCategoryList() {
    const sel = document.getElementById("category");
    CATEGORY_MAP.forEach(c => {
        const o = document.createElement("option");
        o.value = c.en; o.textContent = c.ar; sel.appendChild(o);
    });
}

function initImageSlots() {
    const container = document.getElementById("imageContainer");
    IMAGE_KEYS.forEach((key, i) => {
        const div = document.createElement("div");
        div.className = "img-slot";
        div.innerHTML = `
                    <strong>${IMAGE_KEYS_AR[i]}</strong>
                    <img id="prev-${key}" class="img-preview" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                    <input type="file" accept="image/*" onchange="handleImg(this, '${key}')" style="width: 100%; font-size: 10px;">
                `;
        container.appendChild(div);
    });
}

function initColors() {
    const container = document.getElementById('colorPickerContainer');
    const root = getComputedStyle(document.documentElement);
    Object.entries(colorMap).forEach(([varName, label]) => {
        const div = document.createElement('div');
        div.style = "display:flex; align-items:center; gap:10px;";
        div.innerHTML = `<input type="color" name="${varName}" value="${rgbToHex(root.getPropertyValue(varName).trim())}"> <span>${label}</span>`;
        div.querySelector('input').oninput = (e) => {
            document.documentElement.style.setProperty(varName, e.target.value);
            saveSession();
            renderPreview();
        };
        container.appendChild(div);
    });
}

function handleImg(input, key) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        base64Images[key] = e.target.result;
        document.getElementById(`prev-${key}`).src = e.target.result;
        saveSession();
    };
    reader.readAsDataURL(file);
}

function addQuestion(data = null) {
    const gid = "q" + Math.random().toString(36).substr(2, 9);
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b>سؤال</b>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-move" onclick="move(this,-1)">⬆</button>
                        <button class="btn-move" onclick="move(this,1)">⬇</button>
                        <button class="btn-del" onclick="this.closest('.question').remove(); saveSession(); renderPreview(); updateCounter();">🗑</button>
                    </div>
                </div>
                <input class="qText" placeholder="نص السؤال..." value="${data?.question || ""}">
                <div class="choices">
                    ${[0, 1, 2, 3].map(i => `
                        <label>
                            <input type="radio" name="${gid}" ${data?.correct === data?.choices?.[i] && data?.correct ? "checked" : ""}>
                            <input type="text" value="${data?.choices?.[i] || ""}" placeholder="خيار ${i + 1}">
                        </label>
                    `).join("")}
                </div>
                <div style="margin-top:10px;"><label><input type="checkbox" ${data?.transportable ? "checked" : ""}> قابل للنقل</label></div>
            `;
    div.querySelectorAll("input").forEach(i => i.oninput = () => {
        i.classList.remove('required-error');
        saveSession();
        renderPreview();
    });
    qsContainer.appendChild(div);
    saveSession();
    renderPreview();
    updateCounter();
}

async function validateFields() {
    let isValid = false;
    document.querySelectorAll('.required-error').forEach(el => el.classList.remove('required-error'));

    // Check Nashat Name
    const nInput = document.getElementById('nashatInput');
    if (!nInput.value.trim()) {
        nInput.classList.add('required-error');
        isValid = false;
    }

    // Check Questions
    document.querySelectorAll('.question').forEach(q => {
        const qInput = q.querySelector('.qText');
        if (!qInput.value.trim()) {
            qInput.classList.add('required-error');
            isValid = false;
        }

        let hasCorrect = false;
        const radios = q.querySelectorAll('input[type="radio"]');
        const textInputs = q.querySelectorAll('.choices input[type="text"]');

        textInputs.forEach((txt, idx) => {
            if (!txt.value.trim()) {
                txt.classList.add('required-error');
                isValid = false;
            }
            if (radios[idx].checked) hasCorrect = true;
        });

        if (!hasCorrect) {
            q.style.borderColor = "red";
            isValid = false;
        } else {
            q.style.borderColor = "#ccc";
        }
    });

    if (!isValid) {
        isValid = await confirm("تنبيه: هناك حقول فارغة أو خيارات صحيحة غير محددة. سيتم المتابعة إن أردت ولكن يفضل تعبئتها.");
    }
    return isValid; // We return true anyway as per your request to allow download/upload
}

async function validateAndDownload() {
    if (await validateFields()) {
        downloadJSON();
    }
}

async function validateAndUpload() {
    if (await validateFields()) {
        uploadToCloud();
    }
}

function move(btn, dir) {
    const el = btn.closest(".question");
    if (dir === -1 && el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
    if (dir === 1 && el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
    saveSession(); renderPreview();
}

async function clearAllQuestions(answer = false) {
    if (answer || await confirm("هل أنت متأكد من حذف جميع الأسئلة؟")) {
        qsContainer.innerHTML = "";
        saveSession(); renderPreview(); updateCounter();
    }
}

function filterQuestions() {
    // Helper to remove Arabic diacritics
    const stripHarakat = (text) => {
        return text.replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "");
    };

    const rawTerm = document.getElementById("searchInput").value.toLowerCase();
    const term = stripHarakat(rawTerm); // Clean the search input

    document.querySelectorAll(".question").forEach(q => {
        const qTextInput = q.querySelector(".qText");
        if (!qTextInput) return;

        const rawText = qTextInput.value.toLowerCase();
        const cleanText = stripHarakat(rawText); // Clean the question text

        // Compare cleaned versions
        q.style.display = cleanText.includes(term) ? "block" : "none";
    });
}
function updateCounter() {
    document.getElementById("qCounter").textContent = `عدد الأسئلة: ${document.querySelectorAll(".question").length}`;
}

async function fetchRandom() {
    try {
        const res = await fetch("database.json");
        const data = await res.json();
        const catName = document.getElementById("category").value;
        const lvl = document.getElementById("level").value;
        const cat = data.mainCategories.find(c => c.englishName === catName);
        if (!cat) return;
        const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
        const levelData = topic.levelsData[lvl];
        const qData = levelData[Math.floor(Math.random() * levelData.length)];
        addQuestion({
            question: qData.q,
            choices: qData.answers.map(a => a.answer).slice(0, 4),
            correct: qData.answers.find(a => a.t === 1).answer,
            transportable: false
        });
    } catch (e) { console.error(e); }
}

function nashat(event) {
    window.nashatName = event.target.value;
    event.target.classList.remove('required-error');
}

function gatherData() {
    const colorConfig = {};
    document.querySelectorAll("#colorPickerContainer input").forEach(i => colorConfig[i.name] = i.value);
    const questions = [];
    document.querySelectorAll(".question").forEach(q => {
        const choices = [];
        let correct = null;
        q.querySelectorAll(".choices label").forEach(l => {
            const txt = l.querySelector("input[type='text']").value.trim();
            choices.push(txt);
            if (l.querySelector("input[type='radio']").checked) correct = txt;
        });
        if(q.querySelector(".qText").value.trim() == "") return;
        questions.push({ question: q.querySelector(".qText").value.trim(), choices, transportable: q.querySelector("input[type='checkbox']").checked, correct });
    });
    return { style: { colorConfig, images: base64Images, nashatName: window.nashatName || "مسابقة بدون اسم" }, questions };
}

function downloadJSON() {
    const data = gatherData();
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (window.nashatName || "quiz") + ".json";
    a.click();
}

const firebaseConfig = {
    apiKey: "AIzaSyDAf_Az3osVqlUOFORqaxeyaAgnNBePLqo",
    authDomain: "mosabaqat-a35ff.firebaseapp.com",
    projectId: "mosabaqat-a35ff",
    storageBucket: "mosabaqat-a35ff.firebasestorage.app",
    messagingSenderId: "887308645858",
    appId: "1:887308645858:web:72125a27e8e6fcd59b35bb"
};


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Updated Upload Function
async function uploadToCloud() {
    const btn = document.getElementsByClassName("btn-upload");
    const data = gatherData();
    const selectVal = document.getElementById("nashatSelect").value;
    const inputVal = document.getElementById("nashatInput").value.trim();

    let customId = ""

    if (selectVal === "new") {
        customId = inputVal.replace(/\s+/g, '_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
    } else {
        customId = selectVal; // Use the existing document ID
    }

    if (!customId) {
        alert("يرجى تحديد نشاط أو كتابة اسم جديد");
        return;
    }

    btn.disabled = true;
    btn.textContent = "⌛ جاري الرفع...";

    try {
        // .doc(customId) sets your specific ID
        // .set() writes the data to that specific document
        await db.collection("quizzes").doc(customId).set({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            id: customId
        });

        alert(`✅ تم الرفع بنجاح!\n\nمعرّف المسابقة هو: ${customId}`);

    } catch (e) {
        console.error("Error adding document: ", e);
        alert("❌ فشل الرفع: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "☁️ رفع ملف JSON النهائي إلى الإنترنت";
    }
}
function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const json = JSON.parse(ev.target.result);
        qsContainer.innerHTML = "";
        if (json.questions) json.questions.forEach(q => addQuestion(q));
        if (json.style?.images) {
            base64Images = json.style.images;
            Object.entries(base64Images).forEach(([k, v]) => {
                const img = document.getElementById(`prev-${k}`);
                if (img) img.src = v;
            });
        }
        if (json.style?.nashatName) {
            window.nashatName = json.style.nashatName;
            document.getElementById('nashatInput').value = json.style.nashatName;
        }
        updateCounter(); renderPreview();
    };
    reader.readAsText(file);
}

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb || "#000000";
    const parts = rgb.match(/\d+/g);
    return parts ? "#" + parts.map(x => parseInt(x).toString(16).padStart(2, '0')).join('') : "#000000";
}

function saveSession() { sessionStorage.setItem("quiz_editor_temp", JSON.stringify(gatherData())); }

function loadSession() {
    const saved = sessionStorage.getItem("quiz_editor_temp");
    if (saved) {
        const json = JSON.parse(saved);
        if (json.questions) json.questions.forEach(q => addQuestion(q));
    } else { addQuestion(); }
}
function handleImg(input, key) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_SIZE = 800;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Explicitly clear the canvas to ensure transparency is preserved
            ctx.clearRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            // Change to image/png to keep transparency
            const transparentBase64 = canvas.toDataURL('image/png');

            base64Images[key] = transparentBase64;
            document.getElementById(`prev-${key}`).src = transparentBase64;
            saveSession();
        };
    };
    reader.readAsDataURL(file);
} async function checkIdExists() {
    const select = document.getElementById('nashatSelect').value;
    let name = "";

    if (select === "new") {
        name = document.getElementById('nashatInput').value.trim();
    } else {
        // If they chose an existing one, we already know it exists
        document.getElementById('idStatus').textContent = "⚠️ هذا النشاط موجود بالفعل وسيتم تحديثه.";
        document.getElementById('idStatus').style.color = "orange";
        return;
    }

    const statusEl = document.getElementById('idStatus');
    if (!name) {
        statusEl.textContent = "❌ يرجى كتابة اسم أولاً";
        statusEl.style.color = "red";
        return;
    }

    const customId = name.replace(/\s+/g, '_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
    statusEl.textContent = "⌛ جاري الفحص...";
    statusEl.style.color = "blue";

    try {
        const doc = await db.collection("quizzes").doc(customId).get();
        if (doc.exists) {
            statusEl.textContent = `⚠️ المعرف (${customId}) محجوز لنشاط آخر.`;
            statusEl.style.color = "orange";
        } else {
            statusEl.textContent = "✅ معرف متاح!";
            statusEl.style.color = "green";
        }
    } catch (e) {
        statusEl.textContent = "❌ خطأ في الاتصال";
    }
} function renderPreview() {
    // 1. Existing Question Page Preview
    const first = document.querySelector(".question");
    if (first) {
        document.getElementById("pQ").textContent = first.querySelector(".qText").value || "السؤال سيظهر هنا";
        const pC = document.getElementById("pChoices");
        pC.innerHTML = "";
        first.querySelectorAll(".choices input[type='text']").forEach(i => {
            if (i.value.trim() !== "") { // Only show non-empty choices
                const d = document.createElement("div");
                d.className = "choicePreview";
                d.textContent = i.value;
                pC.appendChild(d);
            }
        });
    }

    // 2. NEW: Grid Numbers Preview
    const pGrid = document.getElementById("pGrid");
    const totalQuestions = document.querySelectorAll(".question").length;
    pGrid.innerHTML = "";

    for (let i = 1; i <= totalQuestions; i++) {
        const numDiv = document.createElement("div");
        numDiv.className = "qNumberPreview";
        numDiv.textContent = i;
        pGrid.appendChild(numDiv);
    }
}
