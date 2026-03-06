import { createApp, ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { Lunar } from 'lunar-javascript';
import { callAI } from './ai';

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

const DELIVERY_MENU = [
    { id: 'pizza', name: '地狱厨房盲盒披萨', price: 88, desc: '你永远不知道下一块是什么口味。' },
    { id: 'catfood', name: '冰山餐厅猫饭', price: 128, desc: '企鹅人亲自监督，含新鲜三文鱼。' },
    { id: 'burger', name: '大都会巨无霸汉堡', price: 65, desc: '分量大到超人也吃不完。' },
    { id: 'coffee', name: '哥谭警局熬夜咖啡', price: 35, desc: '提神醒脑，效果拔群。' }
];

const TAROT_CARDS = [
    "愚人", "魔术师", "女教皇", "女皇", "皇帝", "教皇", "恋人", "战车", "力量", "隐士", 
    "命运之轮", "正义", "倒吊人", "死神", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"
];

const EXPLORE_LOCATIONS = [
    { id: 'alley', name: '犯罪巷 (Crime Alley)', universe: 'dc', category: 'nearby', atmosphere: '阴暗潮湿、危险、哥谭底层泥沼', conflicts: '恶劣天气、流浪动物领地战、底层混混抢劫、蝙蝠猫PTSD。', resonance: '蝙蝠家猫猫（布鲁斯、杰森）会极度警惕，散发威压，试图挡在用户身前。', loot: ['战损帮派武器', '遗落黑市首饰'], checks: ['侦查', '闪避', '斗殴'], npcs: '极其警觉的流浪黑猫群 / 老熟人线人' },
    { id: 'shelter', name: '黑门流浪动物收容所', universe: 'dc', category: 'nearby', atmosphere: '铁丝网高耸、压抑、充满野性与秩序。', conflicts: '帮派火拼、越狱暴动、动物黑帮交易。', resonance: '正义感强的猫猫教训霸凌者，反派猫猫可能直接当上狱霸。', loot: ['帮派猫的信物', '黑帮报恩信'], checks: ['话术', '潜行'], npcs: '掌管底层的独眼老猫狱霸 / 贪婪的看守人员' },
    { id: 'iceberg', name: '冰山企鹅猫咖', universe: 'dc', category: 'nearby', atmosphere: '极度奢华、纸醉金迷的高级黑市。', conflicts: '赌局、金融诈骗、黑吃黑。', resonance: '了解企鹅人的猫猫（提姆、布鲁斯）会对安保嗤之鄙视，并用精妙手段帮你“出老千”。', loot: ['昂贵奢侈品', '企鹅黑卡'], checks: ['妙手', '智力', '话术'], npcs: '戴单片眼镜的“企鹅猫” / 黑面具猫保镖' },
    { id: 'gcpd', name: 'GCPD天台', universe: 'dc', category: 'nearby', atmosphere: '寒冷夜风、警笛回响。', conflicts: '探照灯故障、窃听紧急警情。', resonance: '蝙蝠家猫猫如回自己家，熟练跳上信号灯，甚至对着局长的杯子伸爪子。', loot: ['警用道具', '废弃卷宗残片'], checks: ['侦查', '潜行'], npcs: '抽烟斗、喂流浪猫的戈登局长' },
    { id: 'arkham', name: '阿卡姆宠物医院', universe: 'dc', category: 'nearby', atmosphere: '极度压抑、精神污染、充满绿光与笑声。（极高危险区）', conflicts: '变态机关、恶意谜题、猫猫严重应激。', resonance: '绝大多数超英猫猫表现出极度厌恶或PTSD，焦躁地催促用户离开。', loot: ['恶作剧玩具', '精神系不明药剂'], checks: ['智力', '侦查'], npcs: '狂笑的白脸猫 / 布置问号的谜语猫' },
    { id: 'clocktower', name: '钟塔', universe: 'dc', category: 'nearby', atmosphere: '隐秘高科技、屏幕闪烁的数据中心。', conflicts: '暴走激光阵、数据入侵。', resonance: '芭芭拉或提姆能轻易在键盘上踩出正确密码（用户以为是乱踩）。', loot: ['科技废料', '机密U盘'], checks: ['智力', '敏捷'], npcs: '隐藏在屏幕后的“神谕(Oracle)”防御AI' },
    { id: 'waynetower', name: '韦恩塔顶层', universe: 'dc', category: 'nearby', atmosphere: '狂风呼啸、俯瞰城市的压迫感。', conflicts: '致命坠落、惊险跑酷。', resonance: '布鲁斯或达米安主权意识极强，绝不允许任何飞禽走兽侵犯领空。', loot: ['财团高奢物品', '巨额资金'], checks: ['敏捷', '力量'], npcs: '攻击性老鹰 / 韦恩私人安保' },
    { id: 'batcave', name: '韦恩庄园/蝙蝠洞', universe: 'dc', category: 'nearby', atmosphere: '宁静庭院与高科技冷酷洞穴。', conflicts: '误触警报、惊扰蝙蝠群。', resonance: '蝙蝠家全员“绝对主场”，完美避开红外线，甚至用尾巴拍落瞄准你的麻醉枪。', loot: ['珍稀动植物标本', '装甲残片'], checks: ['潜行', '敏捷'], npcs: '提着手电筒巡视的老管家阿福' },
    { id: 'botanical', name: '哥谭植物园', universe: 'dc', category: 'nearby', atmosphere: '闷热潮湿、致命诱惑的绿色地狱。', conflicts: '变异藤蔓、致幻毒气、超级猫薄荷。', resonance: '猫猫极易被超级猫薄荷吸引而失去理智，表现出难得的“痴汉”或撒娇状态。', loot: ['迷幻花粉', '极品变异猫薄荷'], checks: ['体质', '力量'], npcs: '操纵巨大藤蔓的“毒藤女猫”' },
    { id: 'amusement', name: '游乐园废墟', universe: 'dc', category: 'nearby', atmosphere: '荒诞、充满死亡气息的废弃嘉年欢。（极高危险区）', conflicts: '炸弹陷阱、笑气怪物围攻。', resonance: '气氛压抑，杰森同行时可能极度暴躁并破坏一切长得像小丑的玩具。', loot: ['狂笑道具', '沾血的金币'], checks: ['侦查', '闪避', '敏捷'], npcs: '滴答作响的发条老鼠 / 小丑帮余孽' },
    { id: 'avengers', name: '复仇者大厦', universe: 'marvel', category: 'travel', atmosphere: '科技生活区。', conflicts: 'AI故障危机。', resonance: '斯塔克猫猫的主场，对这里的高科技了如指掌。', loot: ['斯塔克产品', '能量核心', '奢华零食'], checks: ['智力', '侦查'], npcs: 'Dum-E机械臂/AI管家' },
    { id: 'xmansion', name: '泽维尔天才少年学院', universe: 'marvel', category: 'travel', atmosphere: '高危地下室。', conflicts: '危险室全息模拟危机。', resonance: '变种猫猫对危险室非常熟悉。', loot: ['超自然纪念品', '变种人科技', '抗干扰装备'], checks: ['敏捷', '体质'], npcs: '各种变种猫老师' }
];

const initialUser = {
    nickname: '市民',
    gender: '未知',
    job: '普通上班族',
    coins: 1000,
    wallet: {
        balance: 1000,
        transactions: []
    },
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
        const news = ref([]);
        const delivery = reactive({ status: 'idle', currentOrder: null, log: '', isProcessing: false });
        const tarot = reactive({ question: '', cards: [], reading: '', isReading: false });
        const moments = ref(JSON.parse(localStorage.getItem(STORAGE_KEY))?.moments || []);
        const phoneIdentities = {
            1: { name: '布鲁斯·韦恩', avatar: 'https://placehold.co/100x100/1a1a1a/white?text=BW', role: '哥谭首富/正义联盟顾问', color: '#1a1a1a' },
            2: { name: '迪克·格雷森', avatar: 'https://placehold.co/100x100/007cc2/white?text=DG', role: '布鲁德海文警官/夜翼', color: '#007cc2' },
            3: { name: '杰森·陶德', avatar: 'https://placehold.co/100x100/c20000/white?text=JT', role: '自由职业者/红头罩', color: '#c20000' },
            4: { name: '提姆·德雷克', avatar: 'https://placehold.co/100x100/555/white?text=TD', role: '韦恩企业技术主管/红罗宾', color: '#555' },
            5: { name: '达米安·韦恩', avatar: 'https://placehold.co/100x100/006400/white?text=DW', role: '韦恩家族继承人/罗宾', color: '#006400' }
        };

        const phoneState = reactive({
            currentApp: 'home',
            selectedContactId: null,
            isTyping: false
        });

        const phoneChatInput = ref('');
        const phoneChatRef = ref(null);

        const openPhoneChat = (catId) => {
            phoneState.selectedContactId = catId;
            phoneState.currentApp = 'chat';
            nextTick(() => {
                if (phoneChatRef.value) {
                    phoneChatRef.value.scrollTop = phoneChatRef.value.scrollHeight;
                }
            });
        };

        const getPhoneChatHistory = (catId) => {
            const cat = cats.value.find(c => c.id === catId);
            return cat ? cat.chatHistory : [];
        };

        const getPhoneLastMessage = (catId) => {
            const history = getPhoneChatHistory(catId);
            if (history.length === 0) return '暂无消息';
            const last = history[history.length - 1];
            return last.content;
        };

        const getPhoneLastTime = (catId) => {
            return '刚刚';
        };

        const sendPhoneMessage = async () => {
            if (!phoneChatInput.value.trim() || !phoneState.selectedContactId) return;
            const cat = cats.value.find(c => c.id === phoneState.selectedContactId);
            if (!cat) return;

            const msg = phoneChatInput.value;
            phoneChatInput.value = '';
            cat.chatHistory.push({ role: 'user', content: msg });
            
            phoneState.isTyping = true;
            await sendMessage(msg, false, cat);
            phoneState.isTyping = false;
            
            nextTick(() => {
                if (phoneChatRef.value) {
                    phoneChatRef.value.scrollTop = phoneChatRef.value.scrollHeight;
                }
            });
        };

        const generatePhoneNews = () => generateDailyNews();
        const generatePhoneMoments = () => generateMoment();
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
            The goals MUST be mundane for a human (e.g., buying groceries, seeing a doctor).
            DO NOT generate superhero goals like "fighting crime".
            
            Format: JSON array of strings. ["Goal 1", "Goal 2", "Goal 3"]
            Language: Simplified Chinese.`;
            
            try {
                const res = await callAI(prompt, "You are a creative TRPG scenario generator.", 200);
                const goals = parseAIJSON(res);
                if (Array.isArray(goals)) {
                    exploreState.suggestedGoals = goals;
                } else {
                    exploreState.suggestedGoals = ["买菜", "看病", "散步"];
                }
            } catch (e) {
                exploreState.suggestedGoals = ["买菜", "看病", "散步"];
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
            
            const prompt = `[LOGIC D: 2000-WORD HARDCORE TRPG MODULE GENERATION]
            Companion: ${exploreState.companion.name}.
            Companion Persona: ${exploreState.companion.prompt}.
            Companion Appearance: ${exploreState.companion.breed}, ${exploreState.companion.eyeColor}.
            User: ${user.nickname} (${user.job}).
            Location: ${exploreState.location.name}.
            Atmosphere: ${exploreState.location.atmosphere}.
            Resident NPCs: ${exploreState.location.npcs || 'None'}.
            User Goal: ${exploreState.goal}.
            
            Task: Generate a detailed TRPG module outline (approx 2000 words in concept).
            Structure:
            1. 【真相背景】: The hidden superhero/villain plot behind the mundane goal.
            2. 【出场NPC卡表】: Detailed NPCs with motivations.
            3. 【场景与固定线索】: 2-3 areas with specific checks.
            4. 【同行小猫的隐藏剧本】: How the cat secretly protects the user using its powers (disguised as cat behavior).
            5. 【危机触发点与三结局分支】: Success, Fumble/Crisis, Retreat.
            
            Language: Simplified Chinese.`;
            
            try {
                const res = await callAI(prompt, "You are a professional TRPG scenario designer.", 1500);
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

        const addTransaction = (type, amount, title) => {
            const transaction = {
                id: Date.now().toString(),
                type,
                amount,
                title,
                date: new Date().toLocaleString()
            };
            user.wallet.transactions.unshift(transaction);
            if (type === 'income') user.wallet.balance += amount;
            else user.wallet.balance -= amount;
            user.coins = user.wallet.balance; // Sync coins with wallet balance
        };

        const orderDelivery = async (item) => {
            if (user.wallet.balance < item.price) {
                showToast("余额不足", "error");
                return;
            }
            addTransaction('expense', item.price, `外卖: ${item.name}`);
            delivery.currentOrder = item;
            delivery.status = 'delivering';
            delivery.log = '骑手已接单，正在前往餐厅...';
            delivery.isProcessing = true;

            const nightPatrolCat = cats.value.find(c => c.isOut);
            const prompt = `[LOGIC C/D: GOTHAM DELIVERY EVENT]
            User: ${user.nickname} (${user.job}).
            Order: ${item.name}.
            Night Patrol Cat: ${nightPatrolCat ? nightPatrolCat.name : 'None'}.
            
            Task: Determine if the delivery is hijacked (20% chance). 
            If hijacked and a cat is on night patrol, the cat saves it.
            Return JSON: { "status": "送达/丢失", "delivery_log": "..." }`;

            try {
                const res = await callAI(prompt, "You are the Bat-Delivery background AI.", 300);
                const data = parseAIJSON(res);
                if (data) {
                    setTimeout(() => {
                        delivery.log = data.delivery_log;
                        delivery.status = data.status === '送达' ? 'finished' : 'idle';
                        if (data.status === '丢失') {
                            showToast("外卖丢了...", "error");
                            addLog(`外卖丢失: ${item.name}`, "error");
                        } else {
                            showToast("外卖已送达", "success");
                            addLog(`外卖送达: ${item.name}`, "success");
                        }
                        delivery.isProcessing = false;
                    }, 3000);
                }
            } catch (e) {
                delivery.log = "由于哥谭信号干扰，配送信息更新失败。";
                delivery.isProcessing = false;
            }
        };

        const doTarot = async () => {
            if (!tarot.question.trim()) return;
            tarot.isReading = true;
            tarot.cards = [];
            tarot.reading = '';

            const prompt = `[LOGIC D: OCCULT TAROT]
            Question: ${tarot.question}.
            
            Task: Pick 3 cards from ${TAROT_CARDS.join(', ')}. 
            Determine position (Upright/Reversed).
            Provide reading (200-300 words) in the style of Zatanna, Constantine, or Dr. Strange.
            
            Return JSON: { "cards": [{"name": "...", "position": "正位/逆位"}, ...], "reading": "..." }`;

            try {
                const res = await callAI(prompt, "You are a magic-side superhero AI.", 800);
                const data = parseAIJSON(res);
                if (data) {
                    tarot.cards = data.cards;
                    tarot.reading = data.reading;
                }
            } catch (e) {
                tarot.reading = "命运的丝线缠绕在了一起，我无法看清未来的走向。";
            } finally {
                tarot.isReading = false;
            }
        };

        const generateDailyNews = async () => {
            const lastRescue = user.missionReports.find(r => r.missionName === '昨日总结');
            const prompt = `[LOGIC A: GOTHAM DAILY NEWS]
            User: ${user.nickname}.
            Last Rescue/Patrol: ${lastRescue ? lastRescue.summary : 'None'}.
            
            Task: Generate 3 news items (Headline, Sub, Gossip).
            Return JSON array: [{"title": "...", "content": "..."}]`;

            try {
                const res = await callAI(prompt, "You are a veteran reporter for the Gotham Gazette.", 600);
                const data = parseAIJSON(res);
                if (Array.isArray(data)) news.value = data;
            } catch (e) {
                news.value = [{ title: "哥谭日报", content: "今日无事发生。" }];
            }
        };

        const generateMoment = async (cat) => {
            const lastDiary = cat.logs[0];
            const prompt = `[LOGIC D/B: MOMENTS GENERATION]
            Character: ${cat.name}.
            Last Cat Event: ${lastDiary ? lastDiary.content : 'None'}.
            
            Task: Create a social media post in human persona.
            Return JSON: { "content": "...", "image_desc": "..." }`;

            try {
                const res = await callAI(prompt, "You are a superhero in human persona.", 400);
                const data = parseAIJSON(res);
                if (data) {
                    moments.value.unshift({
                        id: Date.now().toString(),
                        author: cat.name,
                        content: data.content,
                        image_desc: data.image_desc,
                        date: new Date().toLocaleString(),
                        likes: Math.floor(Math.random() * 100),
                        comments: []
                    });
                }
            } catch (e) { console.error(e); }
        };

        const sendLocation = (loc) => {
            sendMessage(`[定位: ${loc}]`);
        };

        const sendRedEnvelope = (amount, msg) => {
            if (user.wallet.balance < amount) {
                showToast("余额不足", "error");
                return;
            }
            addTransaction('expense', amount, `发红包给 ${selectedCat.value.name}`);
            sendMessage(`[红包: ${amount}金币, 附言: ${msg}]`);
        };

        const sendPhoto = (desc) => {
            sendMessage(`[照片描述: ${desc}]`);
        };

        const reRollResponse = async () => {
            if (!selectedCat.value) return;
            const cat = selectedCat.value;
            cat.chatHistory.pop(); // Remove last response
            await sendMessage("(请求重新生成回应)", false, true);
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

        const sendMessage = async (overrideMsg = null, isItem = false, isReRoll = false) => {
            const msg = overrideMsg || chatInput.value;
            if (!msg.trim() || !selectedCat.value) return;
            if (!overrideMsg) chatInput.value = '';
            
            const cat = selectedCat.value;
            if (!isReRoll) {
                cat.chatHistory.push({ role: 'user', content: msg });
            }
            thinkingStates[cat.id] = true;

            try {
                const prompt = `
[CHAT INTERACTION]
Character: ${cat.name}. Persona: ${cat.prompt}.
Affinity: ${cat.affinity}. Form: ${cat.isHuman ? 'Human' : 'Cat'}.
User: ${user.nickname} (${user.job}). Status: ${user.currentStatus}.
User Message: "${msg}" ${isItem ? '(Item used)' : ''}
Cat's Current State at Home: ${cat.status}.
Cat's Memory: ${cat.innerVoice}.
${isReRoll ? 'NOTE: This is a RE-ROLL request. Generate a completely different response from the previous one.' : ''}

[SPECIAL FEATURES SUPPORT]:
1. If User sends [定位: (location)], react to the location (e.g., Crime Alley is dangerous).
2. If User sends [红包: (amount)金币, 附言: (msg)], react to the money (e.g., Bruce might find it cute, Tony might mock the small amount).
3. If User sends [照片描述: (desc)], react to the photo content.

[YOUR OUTPUT CAPABILITIES]:
- You can send photos: [照片: (description)]
- You can send red envelopes (if you are rich like Tony/Bruce): [红包: (amount)金币, 附言: (message)]

[REPLY RULES]:
- Stay in character. Do NOT reveal you are the cat.
- Project your cat state into the conversation (e.g., if eating cat food, say you are having a mediocre dinner).
- Use human persona for the reply.

Format:
[STATUS] Action
[VOICE] Inner thought
[REPLY] Response to user (can include [照片: ...] or [红包: ...])
[USER_STATUS] Update user status (max 15 chars)
`;
                const res = await callAI(prompt, STRICT_CANON_PROMPT, 800);
                
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

                // Handle Red Envelope from AI
                const redEnvelopeMatch = reply.match(/\[红包: (\d+)金币, 附言: (.*)\]/);
                if (redEnvelopeMatch) {
                    const amount = parseInt(redEnvelopeMatch[1]);
                    addTransaction('income', amount, `来自 ${cat.name} 的红包`);
                    showToast(`收到来自 ${cat.name} 的红包: ${amount}金币`, "success");
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
            generateDailyNews();
            setInterval(() => { currentTime.value = new Date(); }, 1000);
            setInterval(() => { if(settings.autoUpdate) refreshAllStatus(false); }, 20 * 60 * 1000);
            addLog("系统已启动。欢迎来到韦恩企业猫咖管理系统 v3.5.6");
        });

        watch([user, cats, shopItems, settings, moments], () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, cats: cats.value, shopItems: shopItems.value, settings, moments: moments.value }));
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
            news, delivery, tarot, moments, phoneState, phoneIdentities, phoneChatInput, phoneChatRef,
            orderDelivery, doTarot, generateDailyNews, generateMoment,
            openPhoneChat, getPhoneChatHistory, getPhoneLastMessage, getPhoneLastTime, sendPhoneMessage,
            generatePhoneNews, generatePhoneMoments,
            sendLocation, sendRedEnvelope, sendPhoto, reRollResponse,
            addTransaction,
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
