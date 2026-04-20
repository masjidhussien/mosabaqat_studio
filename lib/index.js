// --- 0.0. POPUP ---
window.alert = showPopup
window.confirm = (params) => showPopup(params, "confirm")

// --- 0.1. DATA MAPS ---
const CATEGORY_MAP = [
    { en: "fiqh", ar: "الفقه" }, { en: "aqida", ar: "العقيدة" },
    { en: "arabic", ar: "اللغة العربية" }, { en: "hadith", ar: "الحديث" },
    { en: "history", ar: "السيرة والتاريخ" }, { en: "tafseer", ar: "التفسير" }
];
const COLOR_MAP = {
    "--question-button-color1": "زر 1", "--question-button-color1-chosen": "زر 1 مختار",
    "--question-button-color2": "زر 2", "--question-button-color2-chosen": "زر 2 مختار",
    "--question-button-font-color": "نص الزر", "--question-button-font-color-chosen": "نص مختار",
    "--question-page-background-color": "خلفية الصفحة", "--question-page-option-color": "لون الخيار",
    "--question-page-font-color": "نص الخيار"
};
const IMAGE_KEYS = ["nashat", "list_background", "question_page_background", "choice_background"];
const IMAGE_KEYS_AR = ["شعار النّشاط", "خلفيّة لائحة الأرقام", "خلفيّة صفحة السّؤال", "خلفيّة الخيار"];
let base64Images = {};

// --- 0.2. FIREBASE STUFF ---
const firebaseConfig = {
    apiKey: "AIzaSyCMQT1xDsm4fOANia81URaarcUKb4UCkh0",
    authDomain: "mh-halaqat-leaderboard.firebaseapp.com",
    projectId: "mh-halaqat-leaderboard",
    storageBucket: "mh-halaqat-leaderboard.firebasestorage.app",
    messagingSenderId: "831219534673",
    appId: "1:831219534673:web:513af63f79fd7880d8e170"
};
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
const auth = firebase.auth(app);
const mosabaqat = db.collection("masjidhussien").doc("mosabaqat").collection("quizzes");

// --- 0.3. DOM ELEMENTS/VARIABLES ---
const qsContainer = document.getElementById("questionsContainer");
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('email-login');
const logoutBtn = document.getElementById('logout');
const loginSection = document.getElementById('login-section');
const userSection = document.getElementsByClassName('content')[0];
const nashatSelect = document.getElementById("nashatSelect");
const nashatInput = document.getElementById("nashatInput");
const deleteNashatBtn = document.getElementById("deleteBtn");
const idStatusSpan = document.getElementById("idStatus");


// --- 0.4. AUTHENTICATION ---
loginBtn.onclick = async () => {
    const email = emailInput.value;
    const pass = passInput.value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);

    } catch (error) {
        console.log("خطأ في تسجيل الدخول: " + error.message);
    }
};
logoutBtn.onclick = () => auth.signOut(auth);
auth.onAuthStateChanged((user) => {
    if (user) {
        loginSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        document.getElementsByClassName("emailValue")[0].textContent = user.email;
        initColors();
        initImageSlots();
        initCategoryList();
        loadSession();
        updateCounter();
        loadExistingQuizzes();
    } else {
        loginSection.classList.remove('hidden');
        userSection.classList.add('hidden');
    }
});

// --- 1. DATA HANDLING ---
async function loadExistingQuizzes() {
    try {
        const snapshot = await mosabaqat.get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = data.style?.nashatName || doc.id;
            sessionStorage.setItem(doc.id, JSON.stringify(data));
            nashatSelect.appendChild(option);
        });
    } catch (e) {
        console.error("Error loading quizzes:", e);
    }
}

async function loadQuizData(id) {
    let data = JSON.parse(sessionStorage.getItem(id));
    const colorPickercontainer = document.getElementById('colorPickerContainer');
    clearAllQuestions(true);
    data.questions.forEach(question => {
        addQuestion(question);
    })
    const colors = handleColors(data.style.config.colors, false);
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
            await mosabaqat.doc(quizId).delete();
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

function toggleNashatInput(value) {
    // Handles NashatInput Value
    if (value === "new") {
        nashatInput.style.display = "block";
        deleteNashatBtn.style.display = "none";
        window.nashatName = nashatInput.value;
    } else {
        nashatInput.style.display = "none";
        deleteNashatBtn.style.display = "block";
        idStatusSpan.textContent = "";
        const select = document.getElementById("nashatSelect");
        window.nashatName = select.options[select.selectedIndex].text;
        loadQuizData(value);
    }
}

function nashat(event) {
    window.nashatName = event.target.value;
    event.target.classList.remove('required-error');
}

async function checkIdExists() {
    let name = "";

    if (nashatSelect.value === "new") {
        name = nashatInput.value.trim();
    } else {
        // If they chose an existing one, we already know it exists
        idStatusSpan.textContent = "⚠️ هذا النشاط موجود بالفعل وسيتم تحديثه.";
        idStatusSpan.style.color = "orange";
        return;
    }
    if (!name) {
        idStatusSpan.textContent = "❌ يرجى كتابة اسم أولاً";
        idStatusSpan.style.color = "red";
        return;
    }

    const customId = name.replace(/\s+/g, '_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
    idStatusSpan.textContent = "⌛ جاري الفحص...";
    idStatusSpan.style.color = "blue";

    try {
        const doc = await mosabaqat.doc(customId).get();
        if (doc.exists) {
            idStatusSpan.textContent = `⚠️ المعرف (${customId}) محجوز لنشاط آخر.`;
            idStatusSpan.style.color = "orange";
        } else {
            idStatusSpan.textContent = "✅ معرف متاح!";
            idStatusSpan.style.color = "green";
        }
    } catch (e) {
        idStatusSpan.textContent = "❌ خطأ في الاتصال";
    }
}

function handleColors(colorMap, init = true) {
    console.log(colorMap);
    
    let colors = [];
    Object.entries(colorMap).forEach(([key, value]) => {
        
        const div = document.createElement('div');
        div.style = "display:flex; align-items:center; gap:10px;";
        div.classList.add(key.includes("chosen") ? "hidden" : null)
        div.innerHTML = `<input type="color" class="${key.includes("chosen") ? "hidden" : ""}" name="${key}" value="${init ? getResolvedColor(key) : value}"> <span>${COLOR_MAP[key]}</span>`;
        console.log(value, key);
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
    return colors;
}

function darkenHex(hex) {
    // 1. Remove '#' if present and normalize shorthand (e.g., #F00 -> #FF0000)
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    // 2. Convert to decimal values
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    // 3. Apply darkening (20% black = 80% original brightness)
    r = Math.round(r * 0.8);
    g = Math.round(g * 0.8);
    b = Math.round(b * 0.8);

    // 4. Convert back to hex and pad with zeros if necessary
    const toHex = (val) => val.toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function initColors() {
    const container = document.getElementById('colorPickerContainer');
    const root = getComputedStyle(document.documentElement);
    handleColors(COLOR_MAP).forEach(color => container.append(color));
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

            ctx.clearRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            const transparentBase64 = canvas.toDataURL('image/png');

            base64Images[key] = transparentBase64;
            document.getElementById(`prev-${key}`).src = transparentBase64;
            saveSession();
        };
    };
    reader.readAsDataURL(file);
}

function updateCounter() {
    document.getElementById("qCounter").textContent = `عدد الأسئلة: ${document.querySelectorAll(".question").length}`;
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
                <div style="margin-top:10px;"><label><input type="checkbox" ${data?.TRANSFERABLE ? "checked" : ""}> قابل للنقل</label></div>
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
            TRANSFERABLE: false
        });
    } catch (e) { console.error(e); }
}

async function clearAllQuestions(answer = false) {
    if (answer || await confirm("هل أنت متأكد من حذف جميع الأسئلة؟")) {
        qsContainer.innerHTML = "";
        saveSession(); renderPreview(); updateCounter();
    }
}

function move(btn, dir) {
    const el = btn.closest(".question");
    if (dir === -1 && el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
    if (dir === 1 && el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
    saveSession(); renderPreview();
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
    return isValid;
}

async function validateAndDownload() {
    if (await validateFields()) {
        downloadJSON();
    }
}

function downloadJSON() {
    const data = gatherData();
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (window.nashatName || "quiz") + ".json";
    a.click();
}

async function validateAndUpload() {
    checkIdExists()
    if (await validateFields()) {
        uploadToCloud();
    }
}

async function uploadToCloud() {
    const btn = document.getElementsByClassName("btn-upload");
    const data = gatherData();


    let customId = ""

    if (nashatSelect.value === "new") {
        customId = nashatInput.value.trim().replace(/\s+/g, '_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
    } else {
        customId = nashatSelect.value; // Use the existing document ID
    }

    if (!customId) {
        alert("يرجى تحديد نشاط أو كتابة اسم جديد");
        return;
    }

    btn.disabled = true;
    btn.textContent = "⌛ جاري الرفع...";

    try {
        await mosabaqat.doc(customId).set({
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

function gatherData() {
    const config = {};
    const colorConfig = {};
    document.querySelectorAll("#colorPickerContainer input").forEach(i => {
        i.name.includes("-chosen") ? colorConfig[i.name] = darkenHex(colorConfig[i.name.replace("-chosen", "")]) :
        colorConfig[i.name] = i.value
    });
    const questions = [];
    document.querySelectorAll(".question").forEach(q => {
        const choices = [];
        let correct = null;
        q.querySelectorAll(".choices label").forEach(l => {
            const txt = l.querySelector("input[type='text']").value.trim();
            choices.push(txt);
            if (l.querySelector("input[type='radio']").checked) correct = txt;
        });
        if (q.querySelector(".qText").value.trim() == "") return;
        questions.push({ question: q.querySelector(".qText").value.trim(), choices, TRANSFERABLE: q.querySelector("input[type='checkbox']").checked, correct });
    });
    config.colors = colorConfig;
    config.options = {};
    document.getElementsByClassName("options")[0].querySelectorAll("label").forEach(label => {
        const input = document.getElementById(label.getAttribute("for"));

        if (!input) return; // Safety check in case the 'for' ID is missing

        // Check if the input is a checkbox or radio button
        const result = (input.type === 'checkbox' || input.type === 'radio')
            ? input.checked
            : input.value;
        config.options[`${label.getAttribute("for")}`] = result;
    });
    return { style: { config, images: base64Images, nashatName: window.nashatName || "مسابقة بدون اسم" }, questions };
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

function getResolvedColor(variableName) {
    const rootStyle = getComputedStyle(document.documentElement);
    const tempElement = document.createElement("div");
    tempElement.style.color = `var(${variableName})`;
    document.body.appendChild(tempElement);
    const computedColor = getComputedStyle(tempElement).color;
    document.body.removeChild(tempElement);
    return rgbToHex(computedColor);
}

function rgbToHex(rgb) {
    let r, g, b;
    let rgbVal = rgb.slice(rgb.indexOf("(")).replace(")", "").replace("(", "").split(",");
    if (rgbVal[0].startsWith("srgb")) {
        rgbVal = rgbVal[0].replace("srgb", "").trim().split(" ")
        rgbVal.forEach((val, i) => {
            rgbVal[i] = val * 255;
        })
    }
    r = rgbVal[0]
    g = rgbVal[1]
    b = rgbVal[2]
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function saveSession() { sessionStorage.setItem("quiz_editor_temp", JSON.stringify(gatherData())); }

function loadSession() {
    const saved = sessionStorage.getItem("quiz_editor_temp");
    if (saved) {
        const json = JSON.parse(saved);
        if (json.questions) json.questions.forEach(q => addQuestion(q));
    } else { addQuestion(); }
}

function renderPreview() {
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