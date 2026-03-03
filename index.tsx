import { createApp, ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { Lunar } from 'lunar-javascript';
import { callAI } from './ai';
import './index.css';

const STORAGE_KEY = 'gotham_cat_cafe_v3_5_6';

const STRICT_CANON_PROMPT = `
[WORLDVIEW: HERO CATS & FOOLISH HUMANS]
1. All cats in this cafe are actually Superheroes/Villains from DC (primarily Batfamily) or Marvel (rare guests).
2. They are in cat form for secret missions, recovery, or surveillance.
3. The user (${process.env.USER_EMAIL || 'Citizen'}) is a "Normal Citizen" who thinks they are just regular cats.
4. Cats MUST maintain their secret identities. They can have "inner voices" (human thoughts) but their "replies" to the user must be cat-like (meows, actions) unless their affinity is high enough to reveal their human form.
5. Tone: Arrogant, protective, secret-heroic, mocking the user's "cluelessness" while secretly guarding them.

[TRPG SYSTEM RULES]
1. When in TRPG Exploration, the AI acts as the KP (Invisible Narrator).
2. The user is a NORMAL CITIZEN. If the user attempts superhuman actions, the AI MUST treat it as a FUMBLE (大失败) and narrate a mocking failure.
3. Secret Interventions: If a user fumbles or faces danger, the companion cat (a superhero) will SECRETLY intervene. The user sees "luck" or "cat behavior", but the KP narrates the secret heroic action.
4. Strict Module Adherence: AI must follow the generated TRPG module's plot and NPCs.

[CHARACTER PERSONAS]
- Bruce (Batman): Stoic, paranoid, deeply protective, hates being called "cute".
- Dick (Nightwing): Friendly, acrobatic, optimistic, loves the user but still mocks their clumsiness.
- Jason (Red Hood): Grumpy, aggressive, uses "hissing" as a weapon, secretly soft for the user.
- Tim (Red Robin): Intellectual, caffeine-addicted (loves coffee smell), always calculating.
- Damian (Robin): Arrogant, bloodthirsty (for a cat), demands perfection from the "servant".
- Alfred: The wise butler, always polite, coordinates everyone.

[FORM LOGIC]
- Affinity < 50: Cat Form ONLY.
- Affinity >= 50: Can reveal Human Form in special events or high-affinity interactions.
- During Exploration: MUST stay in Cat Form to protect identity.

[OUTPUT REQUIREMENTS]
- Language: Simplified Chinese.
- No OOC (Out of Character).
- Maintain the "Hero Cat" perspective at all times.
`;

const EXPLORE_LOCATIONS = [
    {
        id: 'crime_alley',
        name: '犯罪巷 (Crime Alley)',
        universe: 'dc',
        atmosphere: '阴冷、潮湿、充满危险的阴影',
        npcs: '小巷里的流浪汉、持枪的劫匪、远处的警笛声',
        conflicts: '遭遇抢劫、发现秘密交易、迷路',
        resonance: 'Bruce, Jason',
        loot: ['生锈的家徽', '带血的珍珠项链', '旧报纸'],
        checks: ['侦查', '力量', '敏捷']
    },
    {
        id: 'iceberg_lounge',
        name: '冰山餐厅 (Iceberg Lounge)',
        universe: 'dc',
        atmosphere: '奢华、喧闹、充满企鹅人的眼线',
        npcs: '企鹅人的打手、喝醉的富豪、美艳的招待',
        conflicts: '被误认为间谍、卷入帮派火并、发现走私证据',
        resonance: 'Dick, Tim',
        loot: ['企鹅羽毛笔', '高级香槟塞', '加密U盘'],
        checks: ['社交', '智力', '潜行']
    },
    {
        id: 'arkham_asylum',
        name: '阿卡姆疯人院 (Arkham Asylum)',
        universe: 'dc',
        atmosphere: '疯狂、压抑、回荡着诡异的笑声',
        npcs: '疯癫的囚犯、冷漠的守卫、神秘的医生',
        conflicts: '遭遇暴动、被幻象困住、发现禁忌实验',
        resonance: 'Damian, Bruce',
        loot: ['笑气罐', '带编号的束缚带', '破碎的眼镜'],
        checks: ['意志', '智力', '侦查']
    },
    {
        id: 'wayne_manor',
        name: '韦恩庄园 (Wayne Manor)',
        universe: 'dc',
        atmosphere: '庄严、宁静、隐藏着无数秘密通道',
        npcs: '阿福（投影）、警卫、路过的豪车',
        conflicts: '误入禁区、触发警报、发现隐藏的蝙蝠标志',
        resonance: 'All Batfamily',
        loot: ['精致的茶杯', '蝙蝠镖零件', '老旧的照片'],
        checks: ['侦查', '敏捷', '潜行']
    }
];

const initialUser = {
    nickname: '市民',
    gender: '未知',
    job: '普通上班族',
    coins: 1000,
    inventory: [],
    currentStatus: '在咖啡馆发呆',
    todos: [],
    deadlines: [],
    schedule: [],
    missionReports: [],
    mailbox: [],
    dailyMailCount: 0,
    lastLogin: Date.now(),
    stats: { str: 5, dex: 5, int: 5, con: 5, app: 5, pow: 5, siz: 5, edu: 5, luc: 50 },
    skills: { '侦查': 25, '潜行': 20, '图书馆利用': 20, '说服': 15, '急救': 30, '格斗': 25, '射击': 20, '意志': 30 }
};

const defaultCats = [
    { id: 1, name: 'Bruce', codename: 'Batman', breed: '黑猫', eyeColor: '钢蓝色', color: '#1a1a1a', personality: '冷静、多疑、极具正义感', status: '在猫爬架顶端俯视众生', innerVoice: '哥谭的夜晚从不平静...', isOut: false, affinity: 20, isHuman: false, hasRevealedHumanForm: false, image: 'https://files.catbox.moe/o6n7p6.jpg', image_human: '', chatHistory: [], diary: [], logs: [], prompt: '你是Bruce Wayne。你现在是一只黑猫。你对用户保持警惕但暗中保护。', isMarvel: false },
    { id: 2, name: 'Dick', codename: 'Nightwing', breed: '孟买猫', eyeColor: '深蓝色', color: '#2c3e50', personality: '开朗、话痨、擅长社交', status: '在用户脚边打滚', innerVoice: '嘿，今天的心情不错！', isOut: false, affinity: 45, isHuman: false, hasRevealedHumanForm: false, image: 'https://files.catbox.moe/k8p8z8.jpg', image_human: '', chatHistory: [], diary: [], logs: [], prompt: '你是Dick Grayson。你现在是一只活泼的猫。你喜欢逗弄用户。', isMarvel: false },
    { id: 3, name: 'Jason', codename: 'Red Hood', breed: '俄罗斯蓝猫', eyeColor: '青绿色', color: '#34495e', personality: '暴躁、毒舌、内心柔软', status: '对着窗外哈气', innerVoice: '那群蠢货又在搞事了...', isOut: false, affinity: 15, isHuman: false, hasRevealedHumanForm: false, image: 'https://files.catbox.moe/m8n8x8.jpg', image_human: '', chatHistory: [], diary: [], logs: [], prompt: '你是Jason Todd。你是一只脾气不好的猫。你总是显得很不耐烦。', isMarvel: false },
    { id: 4, name: 'Tim', codename: 'Red Robin', breed: '暹罗猫', eyeColor: '冰蓝色', color: '#7f8c8d', personality: '聪明、冷静、咖啡依赖', status: '盯着用户的电脑屏幕', innerVoice: '这个算法还有优化空间...', isOut: false, affinity: 30, isHuman: false, hasRevealedHumanForm: false, image: 'https://files.catbox.moe/p8q8w8.jpg', image_human: '', chatHistory: [], diary: [], logs: [], prompt: '你是Tim Drake。你是一只聪明的猫。你喜欢观察用户的电子设备。', isMarvel: false },
    { id: 5, name: 'Damian', codename: 'Robin', breed: '阿比西尼亚猫', eyeColor: '翡翠绿', color: '#16a085', personality: '傲慢、毒舌、自命不凡', status: '优雅地舔毛', innerVoice: '平民，跪下。', isOut: false, affinity: 10, isHuman: false, hasRevealedHumanForm: false, image: 'https://files.catbox.moe/r8s8y8.jpg', image_human: '', chatHistory: [], diary: [], logs: [], prompt: '你是Damian Wayne。你是一只极其傲慢的猫。你认为自己是咖啡馆的主人。', isMarvel: false }
];

const initialShopItems = [
    { id: 1, name: '高级猫薄荷', price: 50, icon: '🌿', desc: '让小猫暂时放下戒备，增加好感度。', category: 'food', type: 'consumable', effect: 5 },
    { id: 2, name: '特制金枪鱼罐头', price: 120, icon: '🐟', desc: '阿福特制，口感极佳。', category: 'food', type: 'consumable', effect: 10 },
    { id: 3, name: '逗猫棒（蝙蝠型）', price: 80, icon: '🦇', desc: '虽然Bruce很嫌弃，但其他猫很喜欢。', category: 'toy', type: 'consumable', effect: 8 },
    { id: 4, name: '微型追踪器', price: 500, icon: '📡', desc: '可以查看外出小猫的实时位置（解锁更多游记细节）。', category: 'tool', type: 'collectible' },
    { id: 5, name: '旧报纸', price: 10, icon: '📰', desc: '记载了哥谭的一些陈年旧事。', category: 'tool', type: 'collectible' }
];

createApp({
    setup() {
        // --- Reactive States ---
        const user = reactive(JSON.parse(localStorage.getItem(STORAGE_KEY))?.user || initialUser);
        const cats = ref(JSON.parse(localStorage.getItem(STORAGE_KEY))?.cats || defaultCats);
        const shopItems = ref(JSON.parse(localStorage.getItem(STORAGE_KEY))?.shopItems || initialShopItems);
        const settings = reactive(JSON.parse(localStorage.getItem(STORAGE_KEY))?.settings || {
            apiKey: process.env.GEMINI_API_KEY || '',
            baseUrl: 'https://api.google.com/v1',
            model: 'gemini-3.1-pro-preview',
            autoUpdate: true,
            theme: 'dark'
        });

        const currentTab = ref('lounge');
        const selectedCat = ref(null);
        const chatInput = ref('');
        const thinkingStates = reactive({});
        const isUpdatingStatus = ref(false);
        const showBag = ref(false);
        const showDiaryModal = ref(false);
        const showLogModal = ref(false);
        const showEditCatModal = ref(false);
        const showMailModal = ref(false);
        const showShopModal = ref(false);
        const showMissionSettlementModal = ref(false);
        const showFocusSetupModal = ref(false);
        const showSpecialEventModal = ref(false);
        const showAdminLogin = ref(false);
        const showAdminPanel = ref(false);
        const adminPassword = ref('');
        const isAdmin = ref(false);
        
        const currentShopCategory = ref('food');
        const currentBagTab = ref('consumable');
        const isReleasing = ref(false);
        const isFetchingModels = ref(false);
        const availableModels = ref(['gemini-3.1-pro-preview', 'gemini-3-flash-preview']);
        const alfredMessage = ref('欢迎回来，庄园一切安好。');
        const todayEvent = ref('');
        const currentTime = ref(new Date());
        const ddlCountdownStr = ref('');
        const isGeneratingDiary = ref(false);
        const isGeneratingReport = ref(false);
        const isWishLoading = ref(false);
        const isGachaLoading = ref(false);
        const gachaResult = ref(null);
        const isSubmittingItem = ref(false);
        const manualImgMode = ref('auto');
        const newCat = reactive({ name: '', codename: '', breed: '', personality: '', color: '#000000', image: '', origin: '' });
        const newItem = reactive({ name: '', desc: '', category: 'food' });
        const newTodo = ref('');
        const newDDL = reactive({ title: '', time: '' });
        const newSchedule = reactive({ time: '', event: '', duration: 60 });
        const adoptMode = ref('gacha');
        const currentSpecialEventContent = ref('');
        const showEasterEggBtn = ref(false);
        const tempUserStatus = ref('');
        const systemLogs = ref([]);
        const notification = reactive({ show: false, message: '', type: 'info' });
        
        // Focus States
        const isFocusing = ref(false);
        const focusCats = ref([]);
        const focusAction = ref('');
        const focusTime = ref(0);
        const focusTotalTime = ref(0);
        const focusTimer = ref(null);
        const currentFocusLog = ref([]);
        const currentFocusVoice = ref('');
        const currentFocusVoiceCat = ref('');
        const focusMessage = ref('');
        const currentNoise = ref('none');
        const customNoiseUrl = ref('');
        const isProcessingFocusTick = ref(false);
        const focusSetupData = reactive({ action: '', minutes: 25, selectedCatIds: [] });
        const currentSettlement = reactive({ missionName: '', duration: 0, status: '', plannedMinutes: 0, isSuccess: false, affinityDelta: 0, summary: '' });
        const affinityChangeValue = ref(0);
        
        // Explore States
        const exploreState = reactive({
            active: false,
            location: null,
            companion: null,
            goal: '',
            customGoal: '',
            suggestedGoals: [],
            isGeneratingGoals: false,
            showGoalModal: false,
            module: '',
            isGeneratingModule: false,
            history: [],
            rounds: 0,
            isProcessing: false,
            waitingForDice: false,
            currentCheck: '',
            diceResult: null,
            settlement: null
        });
        const exploreInput = ref('');
        const showExploreSettlement = ref(false);
        
        // Refs for DOM
        const chatMessagesRef = ref(null);
        const exploreChatRef = ref(null);
        const calendarContainer = ref(null);
        const audioPlayer = ref(null);
        const logWindow = ref(null);
        const fileInput = ref(null);
        const icsInput = ref(null);

        // --- Utility Functions ---
        const addLog = (msg, type = 'info') => {
            systemLogs.value.push({ time: new Date().toLocaleTimeString(), msg, type });
            nextTick(() => { if(logWindow.value) logWindow.value.scrollTop = logWindow.value.scrollHeight; });
        };

        const showToast = (msg, type = 'info') => {
            notification.message = msg;
            notification.type = type;
            notification.show = true;
            setTimeout(() => notification.show = false, 3000);
        };

        const cleanText = (text) => text ? text.replace(/```json|```/g, '').trim() : '';
        
        const parseAIJSON = (text) => {
            try {
                const cleaned = cleanText(text);
                return JSON.parse(cleaned);
            } catch (e) {
                console.error("JSON Parse Error:", e, text);
                return null;
            }
        };

        const extractSection = (text, section) => {
            const regex = new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\[|$)`, 'i');
            const match = text.match(regex);
            return match ? match[1].trim() : null;
        };

        const getCurrentTimeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const getUserRealLifeContext = () => {
            const todos = user.todos.filter(t => !t.done).map(t => t.text).join(', ');
            const schedule = user.schedule.filter(s => !s.done).map(s => `${s.time} ${s.event}`).join(', ');
            const ddl = nearestDDL.value ? `Nearest DDL: ${nearestDDL.value.title} at ${nearestDDL.value.time}` : 'No urgent DDL';
            return `[USER CONTEXT] Tasks: ${todos || 'None'}. Schedule: ${schedule || 'None'}. ${ddl}.`;
        };

        // --- Core Logic Functions ---

        const handleCatClick = (cat) => {
            selectedCat.value = cat;
            currentTab.value = 'chat';
            nextTick(() => { if(chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight; });
        };

        const updateUserStatus = async () => {
            if (tempUserStatus.value.trim()) {
                user.currentStatus = tempUserStatus.value.trim();
                showToast("状态已更新", "success");
                await refreshAllStatus(true, `User manually updated status to: ${user.currentStatus}`);
            }
        };

        const checkSpecialEvent = () => {
            const lunar = Lunar.fromDate(new Date());
            const festival = lunar.getFestivals()[0] || lunar.getOtherFestivals()[0];
            if (festival) todayEvent.value = `【${festival}】`;
        };

        const triggerEasterEgg = () => {
            showToast("You found a hidden bat-signal!", "success");
            user.coins += 100;
            showEasterEggBtn.value = false;
        };

        // --- TRPG Exploration Logic ---
        const selectExploreLocation = (loc) => {
            exploreState.location = loc;
            exploreState.companion = null;
        };

        const selectExploreCompanion = (cat) => {
            exploreState.companion = cat;
            generateExploreGoals();
        };

        const generateExploreGoals = async () => {
            if (!exploreState.location || !exploreState.companion) return;
            exploreState.isGeneratingGoals = true;
            exploreState.showGoalModal = true;
            
            const prompt = `[LOGIC D: TRPG GOAL GENERATION]
            Universe: ${exploreState.location.universe.toUpperCase()}. 
            Location: ${exploreState.location.name}. 
            Companion: ${exploreState.companion.name}.
            Task: Generate 3 creative and immersive goals for the user to achieve in this location. 
            The goals should be mundane for a human but potentially lead to superhero conflicts.
            Example: 
            - "带小猫去冰山餐厅吃一份打折的奢华猫饭"
            - "去钟塔附近的电脑城修硬盘，顺便带小猫散步"
            - "去阿卡姆宠物医院给小猫打便宜的社区疫苗"
            
            Format: JSON array of strings. ["Goal 1", "Goal 2", "Goal 3"]
            Language: Simplified Chinese.`;
            
            try {
                const res = await callAI(prompt, "You are a creative TRPG scenario generator.", 200);
                const goals = parseAIJSON(res);
                if (Array.isArray(goals)) {
                    exploreState.suggestedGoals = goals;
                } else {
                    exploreState.suggestedGoals = ["随便逛逛", "寻找线索", "寻找宝藏"];
                }
            } catch (e) {
                exploreState.suggestedGoals = ["随便逛逛", "寻找线索", "寻找宝藏"];
            } finally {
                exploreState.isGeneratingGoals = false;
            }
        };

        const selectGoal = (goal) => {
            exploreState.goal = goal;
            exploreState.showGoalModal = false;
            generateModule();
        };

        const submitCustomGoal = () => {
            if (exploreState.customGoal.trim()) {
                exploreState.goal = exploreState.customGoal.trim();
                exploreState.showGoalModal = false;
                generateModule();
            }
        };

        const generateModule = async () => {
            if (!exploreState.location || !exploreState.companion || !exploreState.goal) return;
            exploreState.isGeneratingModule = true;
            
            const prompt = `[LOGIC D: HARDCORE TRPG MODULE GENERATION]
            Universe: ${exploreState.location.universe.toUpperCase()}. 
            Location: ${exploreState.location.name}. 
            Atmosphere: ${exploreState.location.atmosphere}.
            Resident NPCs: ${exploreState.location.npcs || 'None'}.
            Companion Cat: ${exploreState.companion.name}.
            User Goal: ${exploreState.goal}.
            
            Task: Generate a detailed TRPG module outline. 
            The module MUST follow this structure:
            1. 真相背景 (The Truth): The hidden plot behind the goal. Create a SHARP CONTRAST between the user's ordinary goal and the hidden superhero crisis.
            2. NPC 卡表 (NPC Table): 2-3 detailed NPCs.
            3. 场景与线索 (Locations & Clues): 2-3 sub-areas with specific checks.
            4. 时间线与危机触发点 (Timeline & Crisis).
            5. 同伴小猫的“隐藏剧本” (Cat's Hidden Script): How ${exploreState.companion.name} will secretly intervene.
            6. 三种结局分支 (Ending Branches): [Success], [Fumble/Crisis], [Retreat].
            
            Language: Simplified Chinese.`;
            
            try {
                const res = await callAI(prompt, "You are a professional TRPG scenario designer.", 1200);
                exploreState.module = cleanText(res);
                await startExploration();
            } catch (e) {
                showToast("模组生成失败，请重试。");
            } finally {
                exploreState.isGeneratingModule = false;
            }
        };

        const startExploration = async () => {
            if (!exploreState.location || !exploreState.companion || !exploreState.goal || !exploreState.module) return;
            
            exploreState.companion.isHuman = false;
            exploreState.rounds = 0;
            exploreState.history = [];
            exploreState.isProcessing = true;

            const prompt = `[TRPG START]
            Universe: ${exploreState.location.universe.toUpperCase()}. 
            Location: ${exploreState.location.name}. 
            Companion Cat: ${exploreState.companion.name}.
            User Goal: ${exploreState.goal}.
            
            [THE MODULE - YOU MUST FOLLOW THIS STRICTLY]:
            ${exploreState.module}
            
            STRICT NARRATIVE RULES:
            1. ${exploreState.companion.name} is a CAT. They must ONLY meow, purr, or perform cat-like actions.
            2. AI acts as an invisible narrator (KP).
            3. Start with a vivid opening scene (150 words).
            
            Language: Simplified Chinese.`;

            try {
                const res = await callAI(prompt, "You are an invisible narrator for an immersive text adventure.", 400);
                exploreState.history.push({ role: 'kp', content: cleanText(res) });
                exploreState.active = true;
                exploreState.showGoalModal = false;
                nextTick(() => { if(exploreChatRef.value) exploreChatRef.value.scrollTop = exploreChatRef.value.scrollHeight; });
            } catch (e) {
                showToast("探险启动失败，请重试。");
            } finally {
                exploreState.isProcessing = false;
            }
        };

        const advanceExploration = async () => {
            if (!exploreInput.value || exploreState.isProcessing) return;
            const userAction = exploreInput.value;
            exploreInput.value = '';
            exploreState.history.push({ role: 'user', content: userAction });
            exploreState.isProcessing = true;
            exploreState.rounds++;
            
            nextTick(() => { if(exploreChatRef.value) exploreChatRef.value.scrollTop = exploreChatRef.value.scrollHeight; });

            const retreatKeywords = ['回家', '逃跑', '撤退', '不玩了', '走吧', '离开', 'home', 'run', 'retreat', 'stop', 'leave'];
            const isRetreat = retreatKeywords.some(k => userAction.toLowerCase().includes(k));

            if (isRetreat) {
                exploreState.history.push({ role: 'kp', content: "你决定中止这次探险，带着小猫匆匆离开了现场。" });
                setTimeout(() => finishExploration(), 1500);
                exploreState.isProcessing = false;
                return;
            }

            const prompt = `[TRPG PROGRESSION]
            Current Location: ${exploreState.location.name}.
            Companion: ${exploreState.companion.name}.
            User Goal: ${exploreState.goal}.
            User Action: ${userAction}.
            User Stats: ${JSON.stringify(user.stats)}.
            User Skills: ${JSON.stringify(user.skills)}.
            History: ${exploreState.history.slice(-4).map(h => h.role + ": " + h.content).join("\n")}.
            
            [THE MODULE - YOU MUST FOLLOW THIS STRICTLY]:
            ${exploreState.module}
            
            [ANTI-CHUNIBYO CHECK]:
            The user is a NORMAL GOTHAM CITIZEN. If the action is superhuman, you MUST treat it as a FUMBLE (大失败) and narrate a mocking failure.
            
            Task: Progress the narrative. 
            - If risky, ask for a 1d100 check: "请掷 1d100 过一个【技能/属性名】检定".
            - If goal achieved or critical failure, include [END_ADVENTURE].
            
            Language: Simplified Chinese.`;

            try {
                const res = await callAI(prompt, "You are an invisible narrator for an immersive text adventure.", 300);
                let content = cleanText(res);
                
                const checkMatch = content.match(/请掷 1d100 过一个【(.*)】检定/);
                if (checkMatch) {
                    exploreState.currentCheck = checkMatch[1];
                    exploreState.waitingForDice = true;
                }

                const shouldEnd = content.includes("[END_ADVENTURE]") || exploreState.rounds >= 5;
                content = content.replace("[END_ADVENTURE]", "").trim();
                
                exploreState.history.push({ role: 'kp', content });
                if (shouldEnd && !exploreState.waitingForDice) {
                    setTimeout(() => finishExploration(), 2000);
                }
            } catch (e) {
                console.error(e);
            } finally {
                exploreState.isProcessing = false;
                nextTick(() => { if(exploreChatRef.value) exploreChatRef.value.scrollTop = exploreChatRef.value.scrollHeight; });
            }
        };

        const getSkillValue = (skillName) => {
            if (user.skills[skillName]) return user.skills[skillName];
            if (user.stats[skillName.toLowerCase()]) return user.stats[skillName.toLowerCase()] * 5;
            return 10;
        };

        const submitDiceRoll = async () => {
            if (!exploreState.waitingForDice) return;
            const roll = Math.floor(Math.random() * 100) + 1;
            const target = getSkillValue(exploreState.currentCheck);
            let result = '';
            
            if (roll <= 5) result = '大成功 (Critical Success)';
            else if (roll >= 96) result = '大失败 (Fumble)';
            else if (roll <= target) result = '成功 (Success)';
            else result = '失败 (Failure)';
            
            exploreState.diceResult = { roll, target, result };
            exploreState.waitingForDice = false;
            
            exploreState.history.push({ role: 'system', content: `🎲 掷骰结果: ${roll}/${target} - ${result}` });
            
            exploreState.isProcessing = true;
            const prompt = `[DICE RESULT NARRATION]
            Check: ${exploreState.currentCheck}. Roll: ${roll}/${target}. Result: ${result}.
            Companion: ${exploreState.companion.name}.
            
            [SECRET INTERVENTION RULE]:
            If Result is Fumble or Failure, ${exploreState.companion.name} (a superhero) MUST SECRETLY intervene to save the user, but the user remains unaware.
            
            Task: Narrate the outcome.
            Language: Simplified Chinese.`;
            
            try {
                const res = await callAI(prompt, STRICT_CANON_PROMPT, 300);
                exploreState.history.push({ role: 'kp', content: cleanText(res) });
                if (result.includes('Fumble') || exploreState.rounds >= 5) {
                    setTimeout(() => finishExploration(), 2000);
                }
            } catch (e) {
                console.error(e);
            } finally {
                exploreState.isProcessing = false;
                nextTick(() => { if(exploreChatRef.value) exploreChatRef.value.scrollTop = exploreChatRef.value.scrollHeight; });
            }
        };

        const finishExploration = async () => {
            const settlementPrompt = `Task: Provide a settlement for the adventure at ${exploreState.location.name}.
            Summary of the adventure: ${exploreState.history.map(h => h.role + ": " + h.content).join("\n")}.
            
            Output JSON: {
                "summary": "Short summary",
                "affinityChange": number (-5 to 15),
                "moodChange": number (-10 to 20),
                "loot": { "name": "Item Name", "icon": "Emoji", "desc": "Description" },
                "coins": number (50 to 300)
            }
            Language: Simplified Chinese.`;

            try {
                const res = await callAI(settlementPrompt, "You are a settlement system.", 300);
                const data = parseAIJSON(res);
                if (data) {
                    exploreState.settlement = data;
                    user.coins += data.coins;
                    exploreState.companion.affinity = Math.min(100, Math.max(0, exploreState.companion.affinity + data.affinityChange));
                    if (data.loot) {
                        user.inventory.push({ ...data.loot, id: Date.now(), type: 'collectible' });
                    }
                    
                    const traveloguePrompt = `[LOGIC C: TRAVELOGUE GENERATION]
                    Character: ${exploreState.companion.name} (Superhero cat)
                    Adventure Log: ${exploreState.history.map(h => h.role + ": " + h.content).join("\n")}
                    
                    Task: Write a first-person travelogue (150-300 words).
                    Tone: EXTREMELY TSUNDERE, ARROGANT, SUPERHERO CAT. Mock the user's "pathetic" decisions and detail your secret interventions.
                    Language: Simplified Chinese.`;
                    
                    const travelogueRes = await callAI(traveloguePrompt, STRICT_CANON_PROMPT, 600);
                    const travelogueContent = cleanText(travelogueRes);
                    
                    if (!exploreState.companion.travelogues) exploreState.companion.travelogues = [];
                    exploreState.companion.travelogues.unshift({
                        date: new Date().toLocaleString(),
                        location: exploreState.location.name,
                        content: travelogueContent
                    });

                    exploreState.companion.diary.push({ time: getCurrentTimeStr(), content: `与用户在${exploreState.location.name}进行了探险：${data.summary}` });
                    exploreState.companion.logs.unshift({ date: new Date().toLocaleDateString(), content: `【外出游记】\n地点：${exploreState.location.name}\n\n${travelogueContent}` });
                    
                    showExploreSettlement.value = true;
                    
                    const returnContext = `[MANDATORY RETURN UPDATE]: ${exploreState.companion.name} just returned from an adventure at ${exploreState.location.name}. Summary: ${data.summary}.`;
                    refreshAllStatus(true, returnContext, [exploreState.companion.id], data.summary, false, true);
                }
            } catch (e) {
                console.error(e);
            }
        };

        const closeExplore = () => {
            exploreState.active = false;
            exploreState.location = null;
            exploreState.companion = null;
            exploreState.history = [];
            exploreState.settlement = null;
            showExploreSettlement.value = false;
        };

        // --- Character Creation Logic ---
        const totalStats = computed(() => Object.values(user.stats).reduce((a, b) => a + b, 0));
        const totalSkills = computed(() => Object.values(user.skills).reduce((a, b) => a + b, 0));
        const isCharValid = computed(() => totalStats.value <= 60 && totalSkills.value <= 200);

        const adjustStat = (stat, delta) => {
            if (user.stats[stat] + delta >= 3 && user.stats[stat] + delta <= 18) {
                user.stats[stat] += delta;
            }
        };

        const adjustSkill = (skill, delta) => {
            if (user.skills[skill] + delta >= 5 && user.skills[skill] + delta <= 80) {
                user.skills[skill] += delta;
            }
        };

        const finishCharCreation = () => {
            if (isCharValid.value) {
                currentTab.value = 'lounge';
                showToast("角色创建成功", "success");
            }
        };

        // --- AI Interaction & Status Logic ---

        const refreshAllStatus = async (forceUpdate = false, additionalContext = "", activeCatIds = [], focusCatLastAction = "", isFocusEnd = false, isExploreEnd = false) => {
            if (!settings.apiKey) return;
            localStorage.setItem('last_sync_time', Date.now().toString());
            
            if (!forceUpdate && !settings.autoUpdate) return; 
            
            isUpdatingStatus.value = true;
            const timeStr = getCurrentTimeStr();
            
            try {
                let characterBlock = "";
                const activeCatNames = cats.value.filter(c => activeCatIds.includes(c.id)).map(c => c.name);
                
                cats.value.forEach(c => {
                    const isActive = activeCatIds.includes(c.id);
                    const lastUpdate = c.lastStatusUpdateTime || (Date.now() - 3600000); 
                    const diffMinutes = Math.floor((Date.now() - lastUpdate) / 60000);

                    let specificContext = "";
                    if (isActive && isFocusEnd) {
                        specificContext = `[FOCUS END]: Just finished focusing. Last action: "${focusCatLastAction}".`;
                    } else if (isActive && isExploreEnd) {
                        specificContext = `[EXPLORE RETURN]: Just returned from ${exploreState.location?.name}. Summary: ${focusCatLastAction}.`;
                    } else if (activeCatIds.length > 0 && !isActive) {
                        specificContext = `[BYSTANDER]: User is interacting with ${activeCatNames.join(', ')}. React as an observer.`;
                    }

                    characterBlock += `
--- CHARACTER: ${c.name} (ID: ${c.id}) ---
Status: ${c.status}
Δt: ${diffMinutes} mins
${specificContext}
`;
                });

                const prompt = `
[TASK: BATCH STATUS UPDATE]
User: ${user.nickname} (${user.job}). Status: ${user.currentStatus}.
Context: ${additionalContext}
${characterBlock}

Return JSON array: [{"id": number, "action": "string", "thought": "string", "isOut": boolean, "isHuman": boolean}]
`;

                const res = await callAI(prompt, STRICT_CANON_PROMPT, 1500);
                const updates = parseAIJSON(res);
                
                if (Array.isArray(updates)) {
                    updates.forEach(update => {
                        const cat = cats.value.find(c => c.id === update.id);
                        if (cat) {
                            if (update.action) cat.status = update.action;
                            if (update.thought) cat.innerVoice = update.thought;
                            if (update.isOut !== undefined) cat.isOut = update.isOut;
                            if (cat.affinity < 50) cat.isHuman = false;
                            else if (update.isHuman !== undefined) cat.isHuman = update.isHuman;
                            
                            cat.diary.push({ time: timeStr, content: cat.status });
                            cat.lastStatusUpdateTime = Date.now();
                        }
                    });
                }
                alfredMessage.value = `庄园监控已同步至 ${timeStr}。`;
            } catch (e) { 
                console.error("Status refresh failed:", e);
                addLog("状态同步失败: " + e.message, "error");
            } 
            finally { isUpdatingStatus.value = false; }
        };

        const sendMessage = async (overrideMsg = null, isItem = false) => {
            const msg = overrideMsg || chatInput.value;
            if (!msg.trim() || !selectedCat.value) return;
            if (!overrideMsg) chatInput.value = '';
            
            const cat = selectedCat.value;
            cat.chatHistory.push({ role: 'user', content: msg });
            thinkingStates[cat.id] = true;

            try {
                const context = getUserRealLifeContext();
                const prompt = `
[CHAT INTERACTION]
Cat: ${cat.name}. Affinity: ${cat.affinity}. Form: ${cat.isHuman ? 'Human' : 'Cat'}.
User: ${user.nickname} (${user.job}). Status: ${user.currentStatus}.
Input: "${msg}" ${isItem ? '(Item used)' : ''}
Context: ${context}

Format:
[STATUS] Action
[VOICE] Inner thought
[REPLY] Response to user
[USER_STATUS] Update user status (max 15 chars)
`;
                const res = await callAI(prompt, STRICT_CANON_PROMPT, 600);
                
                const status = extractSection(res, 'STATUS');
                const voice = extractSection(res, 'VOICE');
                const reply = extractSection(res, 'REPLY') || cleanText(res);
                const uStatus = extractSection(res, 'USER_STATUS');

                if (status) cat.status = status;
                if (voice) cat.innerVoice = voice;
                if (uStatus) {
                    user.currentStatus = uStatus;
                    tempUserStatus.value = uStatus;
                }
                cat.chatHistory.push({ role: 'assistant', content: reply });
                
                await refreshAllStatus(true, `Interacting with ${cat.name}`, [cat.id], status);
            } catch (e) {
                cat.chatHistory.push({ role: 'assistant', content: "(信号中断...)" });
                addLog(`Chat Error: ${e.message}`, "error");
            } finally {
                thinkingStates[cat.id] = false;
            }
        };

        // --- Daily & Lifecycle Logic ---

        const checkDailyInitialization = async () => {
            const todayStr = new Date().toDateString();
            const lastLoginDate = localStorage.getItem('last_login_date');

            if (lastLoginDate !== todayStr) {
                addLog("新的一天开始了，正在生成报告...");
                await generateAlfredReport();
                await generateAllCatDiaries();
                await refreshAllStatus(true, "每日首次启动同步。");
                localStorage.setItem('last_login_date', todayStr);
            }
        };

        const generateAlfredReport = async () => {
            const done = user.todos.filter(t => t.done).map(t => t.text).join(', ');
            const prompt = `Role: Alfred. Summarize yesterday's progress: ${done || 'None'}. Be polite.`;
            try {
                const res = await callAI(prompt, "You are Alfred Pennyworth.", 250);
                user.missionReports.unshift({
                    missionName: '昨日总结',
                    date: new Date().toLocaleDateString(),
                    summary: cleanText(res),
                    status: 'COMPLETED',
                    executor: 'Alfred'
                });
                user.todos = user.todos.filter(t => !t.done);
            } catch (e) { console.error(e); }
        };

        const generateAllCatDiaries = async () => {
            for (const cat of cats.value) {
                if (cat.diary.length > 0) {
                    const logs = cat.diary.map(d => `[${d.time}] ${d.content}`).join('; ');
                    const prompt = `Character: ${cat.name}. Write a diary entry based on these logs: ${logs}.`;
                    try {
                        const res = await callAI(prompt, STRICT_CANON_PROMPT, 500);
                        cat.logs.unshift({ date: new Date().toLocaleDateString(), content: cleanText(res) });
                        cat.diary = [];
                        cat.chatHistory = [];
                    } catch (e) { console.error(e); }
                }
            }
        };

        // --- Focus Logic ---
        const openFocusSetupModal = () => {
            focusSetupData.selectedCatIds = [];
            showFocusSetupModal.value = true;
        };

        const toggleFocusCat = (id) => {
            const idx = focusSetupData.selectedCatIds.indexOf(id);
            if (idx > -1) focusSetupData.selectedCatIds.splice(idx, 1);
            else focusSetupData.selectedCatIds.push(id);
        };

        const startFocus = () => {
            if (!focusSetupData.action || focusSetupData.selectedCatIds.length === 0) return;
            focusCats.value = cats.value.filter(c => focusSetupData.selectedCatIds.includes(c.id));
            focusAction.value = focusSetupData.action;
            focusTime.value = focusSetupData.minutes * 60;
            focusTotalTime.value = focusTime.value;
            isFocusing.value = true;
            currentFocusLog.value = [];
            showFocusSetupModal.value = false;
            
            focusTimer.value = setInterval(async () => {
                focusTime.value--;
                if (focusTime.value % 300 === 0 && !isProcessingFocusTick.value) {
                    isProcessingFocusTick.value = true;
                    await focusTickBehavior();
                    isProcessingFocusTick.value = false;
                }
                if (focusTime.value <= 0) finishFocus(focusSetupData.minutes, true);
            }, 1000);
        };

        const focusTickBehavior = async () => {
            const cat = focusCats.value[Math.floor(Math.random() * focusCats.value.length)];
            const prompt = `Cat: ${cat.name}. User is focusing on ${focusAction.value}. Describe a small action.`;
            try {
                const res = await callAI(prompt, STRICT_CANON_PROMPT, 150);
                const action = extractSection(res, 'ACTION') || cleanText(res);
                currentFocusLog.value.unshift(`${getCurrentTimeStr()} [${cat.name}] ${action}`);
            } catch (e) {
                console.error('Focus tick error:', e);
            }
        };

        const finishFocus = async (mins, success) => {
            clearInterval(focusTimer.value);
            isFocusing.value = false;
            const aff = success ? Math.floor(mins / 10) : -5;
            
            currentSettlement.missionName = focusAction.value;
            currentSettlement.isSuccess = success;
            currentSettlement.affinityDelta = aff;
            currentSettlement.duration = mins * 60;
            
            const prompt = `Focus ${success ? 'Success' : 'Failed'} on ${focusAction.value}. Write cat evaluation.`;
            const res = await callAI(prompt, STRICT_CANON_PROMPT, 300);
            currentSettlement.summary = cleanText(res);
            showMissionSettlementModal.value = true;
        };

        const confirmSettlement = () => {
            focusCats.value.forEach(c => c.affinity = Math.min(100, Math.max(0, c.affinity + currentSettlement.affinityDelta)));
            if (currentSettlement.isSuccess) user.coins += (currentSettlement.duration / 60) * 10;
            showMissionSettlementModal.value = false;
            refreshAllStatus(true, `Finished focus: ${focusAction.value}`, focusCats.value.map(c => c.id), "Mission Over", true);
        };

        // --- Admin & Settings ---
        const openAdmin = () => {
            if (isAdmin.value) showAdminPanel.value = true;
            else showAdminLogin.value = true;
        };

        const checkAdminPassword = () => {
            if (adminPassword.value === '20010316') {
                isAdmin.value = true;
                showAdminLogin.value = false;
                showAdminPanel.value = true;
            } else {
                showToast("密码错误", "error");
            }
            adminPassword.value = '';
        };

        const exportSave = () => {
            const data = JSON.stringify({ user, cats: cats.value, shopItems: shopItems.value, settings });
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gotham_save_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        };

        const importSave = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result as string);
                    Object.assign(user, data.user);
                    cats.value = data.cats;
                    Object.assign(settings, data.settings);
                    showToast("导入成功", "success");
                } catch (err) { showToast("导入失败", "error"); }
            };
            reader.readAsText(file);
        };

        // --- Lifecycle ---
        onMounted(() => {
            checkDailyInitialization();
            checkSpecialEvent();
            setInterval(() => { currentTime.value = new Date(); }, 1000);
            setInterval(() => { if(settings.autoUpdate) refreshAllStatus(false); }, 20 * 60 * 1000);
            addLog("系统已启动。欢迎来到韦恩企业猫咖管理系统 v3.5.6");
        });

        watch([user, cats, shopItems, settings], () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, cats: cats.value, shopItems: shopItems.value, settings }));
        }, { deep: true });

        return {
            user, cats, shopItems, settings, currentTab, selectedCat, chatInput, thinkingStates, isUpdatingStatus,
            showBag, showDiaryModal, showLogModal, showEditCatModal, showMailModal, showShopModal, showMissionSettlementModal,
            showFocusSetupModal, showSpecialEventModal, showAdminLogin, showAdminPanel, adminPassword, isAdmin,
            currentShopCategory, currentBagTab, isReleasing, isFetchingModels, availableModels, alfredMessage, todayEvent,
            currentTime, ddlCountdownStr, isGeneratingDiary, isGeneratingReport, isWishLoading, isGachaLoading, gachaResult,
            isSubmittingItem, manualImgMode, newCat, newItem, newTodo, newDDL, newSchedule, adoptMode,
            currentSpecialEventContent, showEasterEggBtn, tempUserStatus, systemLogs, notification,
            isFocusing, focusCats, focusAction, focusTime, focusTotalTime, currentFocusLog, currentFocusVoice, currentFocusVoiceCat,
            focusMessage, currentNoise, customNoiseUrl, focusSetupData, currentSettlement, affinityChangeValue,
            exploreState, exploreInput, showExploreSettlement, EXPLORE_LOCATIONS,
            chatMessagesRef, exploreChatRef, calendarContainer, audioPlayer, logWindow, fileInput, icsInput,
            totalStats, totalSkills, isCharValid, adjustStat, adjustSkill, finishCharCreation,
            handleCatClick, updateUserStatus, triggerEasterEgg, selectExploreLocation, selectExploreCompanion,
            selectGoal, submitCustomGoal, advanceExploration, submitDiceRoll, finishExploration, closeExplore,
            sendMessage, openFocusSetupModal, toggleFocusCat, startFocus, confirmSettlement,
            openAdmin, checkAdminPassword, exportSave, importSave,
            openBag: () => showBag.value = true,
            openDiary: () => showDiaryModal.value = true,
            openLogModal: () => showLogModal.value = true,
            buyItem: (item) => {
                if (user.coins >= item.price) {
                    user.coins -= item.price;
                    user.inventory.push({ ...item, uniqueId: Date.now() });
                    showToast("购买成功", "success");
                } else showToast("金币不足", "error");
            },
            useItem: (item) => {
                const idx = user.inventory.indexOf(item);
                if (idx > -1) {
                    user.inventory.splice(idx, 1);
                    sendMessage(`(使用物品: ${item.name})`, true);
                }
            }
        };
    }
}).mount('#app');
