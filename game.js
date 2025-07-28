document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const screens = {
        mainMenu: document.getElementById('main-menu'),
        howToPlay: document.getElementById('how-to-play'),
        dialogue: document.getElementById('dialogue-screen'),
        flashing: document.getElementById('flashing-screen'),
        escape: document.getElementById('escape-screen'),
        gameOver: document.getElementById('game-over-screen'),
        victory: document.getElementById('victory-screen'),
    };

    // New: Technician elements
    const technicianDialogue = document.getElementById('technician');
    const technicianRedOverlay = document.getElementById('technician-red-overlay');

    // Buttons
    const buttons = {
        startGame: document.getElementById('start-game-btn'),
        howToPlay: document.getElementById('how-to-play-btn'),
        backToMenu: document.getElementById('back-to-menu-btn'),
        // nextDialogue: document.getElementById('next-dialogue-btn'), // This button will be removed
        pullCable: document.getElementById('pull-cable-btn'),
        retry: document.getElementById('retry-btn'),
        playAgain: document.getElementById('play-again-btn'),
    };

    // Game State
    let currentScreen = 'mainMenu';
    let soundEnabled = true;
    let suspicionValue = 0; // New: Suspicion value
    let currentDialogueIndex = 0;
    let selectedDialogueQuestions = []; // To store the 3 random questions
    const dialogueOptionsContainer = document.getElementById('dialogue-options'); // New: Container for player options
    const dialogueText = document.getElementById('dialogue-text'); // Moved to global scope

    // Sound function
    const playSFX = (filename) => {
        if (soundEnabled) {
            const audio = new Audio(`assets/sounds/${filename}`);
            audio.play().catch(e => console.error("Error playing sound:", e));
        }
    };

    // --- Technician Visuals ---
    function updateTechnicianVisuals() {
        if (!technicianDialogue || !technicianRedOverlay) return;

        if (suspicionValue > 0) {
            // Clamp suspicion for visual calculation (0-100 range)
            const clampedSuspicion = Math.max(0, Math.min(suspicionValue, 100));

            // Shake amount increases with suspicion, max shake is 4px
            const shakeAmount = (clampedSuspicion / 100) * 4;
            technicianDialogue.style.setProperty('--shake-amount', `${shakeAmount}px`);

            // Start animation only when there's suspicion
            technicianDialogue.style.animation = 'shake 0.4s ease-in-out infinite';

            // Red overlay tint increases with suspicion, max alpha is 0.35
            const redTintAlpha = (clampedSuspicion / 100) * 0.35;
            technicianRedOverlay.style.backgroundColor = `rgba(255, 0, 0, ${redTintAlpha})`;
        } else {
            // Reset visuals when suspicion is zero or less
            technicianDialogue.style.animation = 'none';
            technicianRedOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }
    }

    // Get sound toggle button
    const soundToggleButton = document.getElementById('sound-toggle-btn');
    if (soundToggleButton) {
        soundToggleButton.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundToggleButton.textContent = `音效: ${soundEnabled ? '开' : '关'}`;
            playSFX('button-click.wav'); // Play sound when toggling
        });
    }

    // Backgrounds
    const backgrounds = {
        mainMenu: document.getElementById('main-menu-bg'),
        gamePlay: document.getElementById('game-play-bg'),
        mainMenuOverlay: document.getElementById('main-menu-overlay'),
    };

    const switchScreen = (screenName) => {
        // 重置已完成状态
        localStorage.setItem('hasFinished', 'false');
        screens[currentScreen].classList.remove('active');
        screens[screenName].classList.add('active');
        currentScreen = screenName;

        // Hide all backgrounds and overlays first
        for (const key in backgrounds) {
            backgrounds[key].style.display = 'none';
        }

        // Show the appropriate background and overlay
        if (screenName === 'mainMenu' || screenName === 'howToPlay') {
            backgrounds.mainMenu.style.display = 'block';
            backgrounds.mainMenuOverlay.style.display = 'block';
        } else if (screenName === 'dialogue' || screenName === 'flashing' || screenName === 'escape' || screenName === 'gameOver' || screenName === 'victory') {
            backgrounds.gamePlay.style.display = 'block';
        }
    };

    // --- Main Menu Logic ---
    buttons.startGame.addEventListener('click', () => {
        playSFX('button-click.wav');
        resetGame();
        switchScreen('dialogue');
        initializeDialogue(); // New: Initialize dialogue
    });
    buttons.howToPlay.addEventListener('click', () => {
        playSFX('button-click.wav');
        switchScreen('howToPlay');
    });
    buttons.backToMenu.addEventListener('click', () => {
        playSFX('button-click.wav');
        switchScreen('mainMenu');
    });
    buttons.retry.addEventListener('click', () => {
        playSFX('button-click.wav');
        resetGame();
        switchScreen('mainMenu');
    });
    buttons.playAgain.addEventListener('click', () => {
        playSFX('button-click.wav');
        resetGame();
        switchScreen('mainMenu');
    });

    // --- Dialogue Logic ---
    const dialogueData = [
        {
            "question": "师傅：你这手机里有重要数据吗？",
            "answers": [
                { "text": "我：都备份好了，没问题。", "suspicion": 0 },
                { "text": "我：没什么重要数据。", "suspicion": -5 },
                { "text": "我：数据很重要，但为了刷机豁出去了。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你是不是想自己动手刷机？",
            "answers": [
                { "text": "我：不敢，还是交给专业师傅放心。", "suspicion": -10 },
                { "text": "我：想过，但怕搞砸了。", "suspicion": 0 },
                { "text": "我：是的，但没工具，所以来你这。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你这个型号的手机，刷机后可能会有些小bug，能接受吗？",
            "answers": [
                { "text": "我：小bug没关系，只要大体流畅就行。", "suspicion": 0 },
                { "text": "我：啊？会有bug吗？那我再考虑一下。", "suspicion": -5 },
                { "text": "我：没问题，我自己会搞定那些bug。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你之前有没有尝试过自己刷机？",
            "answers": [
                { "text": "我：没有，我是新手。", "suspicion": -5 },
                { "text": "我：尝试过几次，但是没有成功。", "suspicion": 10 },
                { "text": "我：当然有，但我没专业设备。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你知道刷机可能会导致手机变砖吗？",
            "answers": [
                { "text": "我：知道，所以才找您专业的。", "suspicion": 0 },
                { "text": "我：变砖？这么严重吗？", "suspicion": -5 },
                { "text": "我：我知道风险，能救回来就行。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你刷机是为了什么特定功能吗？",
            "answers": [
                { "text": "我：就是想让手机更流畅，用起来舒服。", "suspicion": 0 },
                { "text": "我：听说刷机能玩一些特殊功能。", "suspicion": 5 },
                { "text": "我：为了装一些商店没有的App。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：我们这里只提供官方固件降级服务，第三方ROM不刷的。",
            "answers": [
                { "text": "我：好的，我就要官方版本。", "suspicion": 0 },
                { "text": "我：啊？那我想刷的那个ROM怎么办？", "suspicion": 10 },
                { "text": "我：没事，我自己会想办法刷进去。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机时间会比较长，你大概需要等多久？",
            "answers": [
                { "text": "我：没关系，我可以在这里等。", "suspicion": 0 },
                { "text": "我：大概要多久啊？我有点急事。", "suspicion": -5 },
                { "text": "我：没关系，我下午再来取。", "suspicion": 0 }
            ]
        },
        {
            "question": "师傅：你对手机硬件了解吗？",
            "answers": [
                { "text": "我：不太了解，主要懂软件。", "suspicion": 0 },
                { "text": "我：一般般吧，能看懂一些拆机视频。", "suspicion": 5 },
                { "text": "我：我大学专业就是这个，还算懂一些。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后如果出现其他问题，我们只负责这次刷机引起的问题，其他概不负责。",
            "answers": [
                { "text": "我：明白，师傅辛苦了。", "suspicion": 0 },
                { "text": "我：好的，我相信你们的专业。", "suspicion": -5 },
                { "text": "我：万一其他问题也是刷机间接引起的呢？", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你这款手机型号比较特殊，刷机工具可能不太好找。",
            "answers": [
                { "text": "我：啊？那还能刷吗？", "suspicion": 0 },
                { "text": "我：没关系，慢慢找，我等着。", "suspicion": -5 },
                { "text": "我：我这里有全套工具和固件，需要吗？", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：你平时用手机多吗？担心刷机后影响使用。",
            "answers": [
                { "text": "我：挺多的，所以才想弄流畅点。", "suspicion": 0 },
                { "text": "我：还好，主要是玩游戏。", "suspicion": 5 },
                { "text": "我：我还有备用机，不影响。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你手机有没有Root过？",
            "answers": [
                { "text": "我：没有，完全是原厂系统。", "suspicion": 0 },
                { "text": "我：以前Root过，后来解除了。", "suspicion": 10 },
                { "text": "我：Root是必备操作，当然Root过。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机费用是XXX元，没问题吧？",
            "answers": [
                { "text": "我：可以，价格合理。", "suspicion": 0 },
                { "text": "我：能便宜点吗？", "suspicion": -5 },
                { "text": "我：你们这儿价格有点高啊。", "suspicion": 5 }
            ]
        },
        {
            "question": "师傅：刷机完成后，你还需要进行一些初始设置。",
            "answers": [
                { "text": "我：好的，我自己会弄。", "suspicion": 0 },
                { "text": "我：你们能帮忙设置一下吗？", "suspicion": -5 },
                { "text": "我：这些我熟，不用担心。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的系统版本有什么具体要求吗？",
            "answers": [
                { "text": "我：就是想降到某个老版本，具体您看着办。", "suspicion": 0 },
                { "text": "我：我想要安卓X的版本，越稳定越好。", "suspicion": 5 },
                { "text": "我：我要求降到XX版本，不要高于YY版本。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机成功率不是百分之百，你做好心理准备了吗？",
            "answers": [
                { "text": "我：做好了，我相信你们的技术。", "suspicion": 0 },
                { "text": "我：啊？那要是失败了怎么办？", "suspicion": -5 },
                { "text": "我：没事，失败了再想办法。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：看你这手机屏幕，是不是换过？",
            "answers": [
                { "text": "我：没有啊，一直原装。", "suspicion": 0 },
                { "text": "我：嗯，之前摔碎了换过一块。", "suspicion": 5 },
                { "text": "我：这不重要吧，和刷机有关系吗？", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的电池健康度有要求吗？刷机后可能略有影响。",
            "answers": [
                { "text": "我：只要不是影响太大就行。", "suspicion": 0 },
                { "text": "我：啊？还会影响电池吗？", "suspicion": -5 },
                { "text": "我：电池可以再换，没关系。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：我们刷机只负责系统，里面App的问题我们不管的。",
            "answers": [
                { "text": "我：好的，App我自己会处理。", "suspicion": 0 },
                { "text": "我：那App卡顿怎么办？", "suspicion": -5 },
                { "text": "我：App的问题通常刷机就能解决。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你平时用手机有没有遇到什么奇怪的现象？",
            "answers": [
                { "text": "我：就是卡顿，没啥奇怪的。", "suspicion": 0 },
                { "text": "我：偶尔有些App闪退。", "suspicion": 5 },
                { "text": "我：有时会自动重启，或出现奇怪的英文界面。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机之后手机发热可能会增加，你能接受吗？",
            "answers": [
                { "text": "我：一点点发热没关系。", "suspicion": 0 },
                { "text": "我：发热会很严重吗？", "suspicion": -5 },
                { "text": "我：我会优化，没问题。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你刷机是为了绕过什么限制吗？",
            "answers": [
                { "text": "我：不是，就是为了流畅度。", "suspicion": 0 },
                { "text": "我：呃，没有啊。", "suspicion": 5 },
                { "text": "我：嗯，为了用某些被限制的功能。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：我们这里刷机是按步骤操作的，不能中途更改。",
            "answers": [
                { "text": "我：好的，理解。", "suspicion": 0 },
                { "text": "我：如果我觉得不满意，可以再换个版本吗？", "suspicion": 10 },
                { "text": "我：嗯，我知道流程。", "suspicion": 5 }
            ]
        },
        {
            "question": "师傅：刷机后有些银行App或者支付App可能无法正常使用，你知道吗？",
            "answers": [
                { "text": "我：知道，我用备用机支付。", "suspicion": 0 },
                { "text": "我：啊？那很不方便啊！", "suspicion": -5 },
                { "text": "我：我有办法绕过检测。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：你这手机的储存空间还够用吗？刷机需要预留一些空间。",
            "answers": [
                { "text": "我：够用，我清理过了。", "suspicion": 0 },
                { "text": "我：不太够，能帮我清理一下吗？", "suspicion": -5 },
                { "text": "我：空间足够，我有很多备用存储。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机后耗电量可能会增加，你做好准备了吗？",
            "answers": [
                { "text": "我：嗯，可以接受。", "suspicion": 0 },
                { "text": "我：那要增加多少啊？", "suspicion": -5 },
                { "text": "我：没关系，我会用省电工具。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对刷机流程是不是特别了解？",
            "answers": [
                { "text": "我：还好，只懂皮毛。", "suspicion": 0 },
                { "text": "我：看过一些视频，感觉挺复杂的。", "suspicion": -5 },
                { "text": "我：我经常在论坛里交流这些。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机成功后，如果再想升级系统，可能需要再次刷机。",
            "answers": [
                { "text": "我：没问题，我知道了。", "suspicion": 0 },
                { "text": "我：啊？这么麻烦吗？", "suspicion": 5 },
                { "text": "我：我自己可以搞定升级。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你是不是听别人推荐来我们这里的？",
            "answers": [
                { "text": "我：是的，朋友介绍的。", "suspicion": 0 },
                { "text": "我：我在网上搜到的。", "suspicion": -5 },
                { "text": "我：我之前在这里刷过别的手机。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你刷机主要想解决哪个具体问题？",
            "answers": [
                { "text": "我：卡顿严重，开App很慢。", "suspicion": 0 },
                { "text": "我：手机总是提示储存空间不足。", "suspicion": -5 },
                { "text": "我：我想安装谷歌服务框架。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机有可能会影响到你的移动支付安全，请注意。",
            "answers": [
                { "text": "我：明白，我会小心的。", "suspicion": 0 },
                { "text": "我：怎么会影响呢？", "suspicion": 5 },
                { "text": "我：我已经有其他支付方案了。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有试过恢复出厂设置？",
            "answers": [
                { "text": "我：试过，没用。", "suspicion": 0 },
                { "text": "我：没有，怕数据丢了。", "suspicion": -5 },
                { "text": "我：恢复出厂设置解决不了根本问题。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你这手机的IMEI码和串号都在吗？",
            "answers": [
                { "text": "我：在的，都在壳子上。", "suspicion": 0 },
                { "text": "我：在哪里看啊？", "suspicion": -5 },
                { "text": "我：我不太清楚，和刷机有关系吗？", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机过程中可能会有数据线断开的风险，你知道吗？",
            "answers": [
                { "text": "我：知道，我会看好。", "suspicion": 0 },
                { "text": "我：啊？那怎么办？", "suspicion": -5 },
                { "text": "我：我有备用数据线。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你平时会自己清理手机垃圾吗？",
            "answers": [
                { "text": "我：会啊，经常清理。", "suspicion": 0 },
                { "text": "我：不太会，都是App自动清理。", "suspicion": -5 },
                { "text": "我：我直接格式化。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机成功后，如果发现手机功能有异常，及时联系我们。",
            "answers": [
                { "text": "我：好的，没问题。", "suspicion": 0 },
                { "text": "我：嗯，希望不会有问题。", "suspicion": -5 },
                { "text": "我：我自己会检查和修复。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你这手机是不是在官方渠道购买的？",
            "answers": [
                { "text": "我：是的，官网买的。", "suspicion": 0 },
                { "text": "我：朋友送的，不太清楚。", "suspicion": 5 },
                { "text": "我：水货，但配置很高。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的续航可能会有变化，你了解吗？",
            "answers": [
                { "text": "我：了解，希望是变好。", "suspicion": 0 },
                { "text": "我：会变得很差吗？", "suspicion": -5 },
                { "text": "我：我自己有便携充电宝。", "suspicion": 5 }
            ]
        },
        {
            "question": "师傅：你有没有想过换新手机？",
            "answers": [
                { "text": "我：这手机还能用，不想换。", "suspicion": 0 },
                { "text": "我：想过，但是预算不够。", "suspicion": -5 },
                { "text": "我：这手机刷机后比新手机还好用。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机可能会导致部分App无法正常运行，比如金融类App。",
            "answers": [
                { "text": "我：知道，我早有准备。", "suspicion": 0 },
                { "text": "我：真的吗？那怎么办？", "suspicion": -5 },
                { "text": "我：我有办法让它们正常运行。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：你对刷机后的系统界面有什么偏好吗？",
            "answers": [
                { "text": "我：越简洁越好。", "suspicion": 0 },
                { "text": "我：没什么特别要求，流畅就行。", "suspicion": -5 },
                { "text": "我：我喜欢自定义程度高的系统。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机过程中，请不要离开，以免有突发情况需要确认。",
            "answers": [
                { "text": "我：好的，我就在这里等着。", "suspicion": 0 },
                { "text": "我：我出去抽根烟，马上回来。", "suspicion": 5 },
                { "text": "我：没事，我手机丢这，您弄好了通知我。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你这手机以前有没有修过？",
            "answers": [
                { "text": "我：没有，第一次维修。", "suspicion": 0 },
                { "text": "我：换过一次屏幕。", "suspicion": 5 },
                { "text": "我：自己动手修过，但没修好。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机可能无法接收OTA更新，你知道吗？",
            "answers": [
                { "text": "我：知道，我会手动更新。", "suspicion": 0 },
                { "text": "我：啊？那以后怎么升级啊？", "suspicion": -5 },
                { "text": "我：OTA更新对我来说没意义。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你是不是专业搞手机的？",
            "answers": [
                { "text": "我：不是，只是个普通用户。", "suspicion": 0 },
                { "text": "我：略懂一些皮毛。", "suspicion": 5 },
                { "text": "我：算是半个爱好者吧。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的相机功能可能会有细微的变化，你介意吗？",
            "answers": [
                { "text": "我：不介意，主要用来看视频。", "suspicion": 0 },
                { "text": "我：会变差吗？我挺喜欢拍照的。", "suspicion": -5 },
                { "text": "我：我可以自己刷个相机优化包。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Root权限有什么了解吗？",
            "answers": [
                { "text": "我：知道可以获取更高权限。", "suspicion": 0 },
                { "text": "我：不太懂，有什么用？", "suspicion": -5 },
                { "text": "我：Root是玩机必备，我经常Root。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的安全性可能会降低，你知道吗？",
            "answers": [
                { "text": "我：知道，我会安装安全软件。", "suspicion": 0 },
                { "text": "我：降低多少啊？会不会被黑客攻击？", "suspicion": 5 },
                { "text": "我：安全性对我来说不重要。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你刷机是为了体验新功能还是为了解决旧问题？",
            "answers": [
                { "text": "我：主要为了解决卡顿问题。", "suspicion": 0 },
                { "text": "我：想试试新的安卓版本。", "suspicion": 5 },
                { "text": "我：两者都想。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机后手机的NFC或者指纹识别功能可能会失效，你知道吗？",
            "answers": [
                { "text": "我：知道，不常用这些功能。", "suspicion": 0 },
                { "text": "我：啊？那很不方便啊！", "suspicion": -5 },
                { "text": "我：我已经有其他替代方案了。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有刷机失败的经验？",
            "answers": [
                { "text": "我：没有，所以才来找您。", "suspicion": 0 },
                { "text": "我：有，但都是小问题，自己搞定了。", "suspicion": 10 },
                { "text": "我：经常失败，但每次都能救回来。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：你有没有尝试过其他手机维修店？",
            "answers": [
                { "text": "我：没有，第一次来维修。", "suspicion": 0 },
                { "text": "我：去过其他店，但没解决问题。", "suspicion": 5 },
                { "text": "我：其他店技术不行，所以来您这。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机完成后，如果手机无法开机，我们不负责恢复数据。",
            "answers": [
                { "text": "我：好的，我知道了。", "suspicion": 0 },
                { "text": "我：那我的数据怎么办？", "suspicion": -5 },
                { "text": "我：我数据都备份在云端了。", "suspicion": 5 }
            ]
        },
        {
            "question": "师傅：你对手机的底层架构有了解吗？",
            "answers": [
                { "text": "我：不太了解，只知道大概。", "suspicion": 0 },
                { "text": "我：知道一些，但不是专家。", "suspicion": 5 },
                { "text": "我：我就是做软件开发的，对底层很熟。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的性能提升可能不明显，你能接受吗？",
            "answers": [
                { "text": "我：只要比现在流畅就行。", "suspicion": 0 },
                { "text": "我：那还有必要刷吗？", "suspicion": -5 },
                { "text": "我：我相信会有明显提升。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对刷机后的系统版本有什么期待吗？",
            "answers": [
                { "text": "我：希望能流畅稳定。", "suspicion": 0 },
                { "text": "我：越接近原生安卓越好。", "suspicion": 5 },
                { "text": "我：我希望有某种定制功能。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机需要拆开手机吗？",
            "answers": [
                { "text": "我：不用拆吧？", "suspicion": 0 },
                { "text": "我：如果需要，可以拆。", "suspicion": 5 },
                { "text": "我：我能自己拆。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你有没有关注过刷机社区或者论坛？",
            "answers": [
                { "text": "我：偶尔看看帖子。", "suspicion": 0 },
                { "text": "我：没有，不太懂这些。", "suspicion": -5 },
                { "text": "我：我是那里的活跃用户。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机可能会出现一些兼容性问题，你知道吗？",
            "answers": [
                { "text": "我：知道，我会注意的。", "suspicion": 0 },
                { "text": "我：什么兼容性问题？", "suspicion": -5 },
                { "text": "我：这些问题我都能自己解决。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Bootloader有没有了解？",
            "answers": [
                { "text": "我：知道是引导加载器。", "suspicion": 0 },
                { "text": "我：不太懂，那是什么？", "suspicion": -5 },
                { "text": "我：我已经解锁了。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的音质可能会有变化，你介意吗？",
            "answers": [
                { "text": "我：不介意，主要听个响。", "suspicion": 0 },
                { "text": "我：会变差吗？我平时用耳机听歌。", "suspicion": 5 },
                { "text": "我：我有专业的音频设备，不依赖手机。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有考虑过手机的安全更新？刷机后可能无法及时接收。",
            "answers": [
                { "text": "我：知道，我不太在意。", "suspicion": 0 },
                { "text": "我：那怎么办？安全更新很重要啊。", "suspicion": -5 },
                { "text": "我：我可以自己打补丁。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机需要多长时间？",
            "answers": [
                { "text": "我：大概多久能好？", "suspicion": 0 },
                { "text": "我：希望快一点。", "suspicion": -5 },
                { "text": "我：我知道大概时间，不着急。", "suspicion": 5 }
            ]
        },
        {
            "question": "师傅：你对手机的固件版本有什么特殊要求吗？",
            "answers": [
                { "text": "我：没有，越稳定越好。", "suspicion": 0 },
                { "text": "我：我希望是某个具体的版本号。", "suspicion": 10 },
                { "text": "我：我需要一个不带广告的纯净版。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的网络连接可能会有影响，你知道吗？",
            "answers": [
                { "text": "我：知道，我会再设置。", "suspicion": 0 },
                { "text": "我：会影响信号吗？", "suspicion": -5 },
                { "text": "我：我有多张SIM卡，不担心。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你这手机的屏幕指纹识别功能正常吗？",
            "answers": [
                { "text": "我：正常，没有问题。", "suspicion": 0 },
                { "text": "我：不太灵敏，希望刷机后能改善。", "suspicion": 5 },
                { "text": "我：我平时不用指纹识别。", "suspicion": 0 }
            ]
        },
        {
            "question": "师傅：刷机后手机的GPS定位可能会不准确，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不常用地图导航。", "suspicion": 0 },
                { "text": "我：啊？那会影响导航吗？", "suspicion": -5 },
                { "text": "我：我有独立的GPS设备。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对刷机工具熟悉吗？",
            "answers": [
                { "text": "我：不太熟悉，主要靠您。", "suspicion": 0 },
                { "text": "我：略知一二，但没用过。", "suspicion": 5 },
                { "text": "我：我电脑里有全套工具。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的蓝牙和WiFi功能可能会不稳定，你了解吗？",
            "answers": [
                { "text": "我：了解，我会测试的。", "suspicion": 0 },
                { "text": "我：那怎么办公呢？", "suspicion": -5 },
                { "text": "我：我会自己调试。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有考虑过，刷机成功了，但你可能不喜欢新系统？",
            "answers": [
                { "text": "我：应该不会吧，我考虑好了。", "suspicion": 0 },
                { "text": "我：那可以再刷回去吗？", "suspicion": 5 },
                { "text": "我：不喜欢就再刷别的版本。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的售后服务可能会受到影响，你清楚吗？",
            "answers": [
                { "text": "我：清楚，我接受。", "suspicion": 0 },
                { "text": "我：会完全失去保修吗？", "suspicion": -5 },
                { "text": "我：这手机本来就没保修了。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Recovery模式了解多少？",
            "answers": [
                { "text": "我：知道是恢复模式。", "suspicion": 0 },
                { "text": "我：不太懂，有什么用？", "suspicion": -5 },
                { "text": "我：我经常进Recovery刷补丁。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的震动功能可能会变弱或失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我平时开静音。", "suspicion": 0 },
                { "text": "我：会很明显吗？", "suspicion": -5 },
                { "text": "我：我可以自己修复。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你是不是打算长期使用这台手机？",
            "answers": [
                { "text": "我：是的，希望能再战几年。", "suspicion": 0 },
                { "text": "我：暂时用着，过段时间可能换。", "suspicion": -5 },
                { "text": "我：是的，我要把它刷成传家宝。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机后手机的传感器可能会不灵敏，你知道吗？",
            "answers": [
                { "text": "我：知道，可以接受。", "suspicion": 0 },
                { "text": "我：比如哪些传感器？", "suspicion": -5 },
                { "text": "我：这些都能校准的。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有自己制作过刷机包？",
            "answers": [
                { "text": "我：没有，不敢尝试。", "suspicion": 0 },
                { "text": "我：想过，但没有技术。", "suspicion": 5 },
                { "text": "我：是的，我偶尔会自己编译ROM。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的麦克风或扬声器可能会出现杂音，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以外接设备。", "suspicion": 0 },
                { "text": "我：那通话怎么办？", "suspicion": -5 },
                { "text": "我：应该不会吧，这是硬件问题。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对刷机后的系统权限有什么要求？",
            "answers": [
                { "text": "我：能正常使用就行。", "suspicion": 0 },
                { "text": "我：希望权限更开放一些。", "suspicion": 10 },
                { "text": "我：我需要完全Root权限。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的相机画质可能会下降，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用手机拍照。", "suspicion": 0 },
                { "text": "我：会下降很多吗？", "suspicion": -5 },
                { "text": "我：我可以自己找GCam来优化。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己购买刷机设备？",
            "answers": [
                { "text": "我：没有，太麻烦了。", "suspicion": 0 },
                { "text": "我：想过，但太贵了。", "suspicion": -5 },
                { "text": "我：我已经买了，但有些地方不懂。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机可能会失去一些厂商预装的特色功能，你介意吗？",
            "answers": [
                { "text": "我：不介意，那些功能我也不用。", "suspicion": 0 },
                { "text": "我：会失去哪些功能啊？", "suspicion": -5 },
                { "text": "我：那些功能本身就是累赘。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的加密方式有了解吗？",
            "answers": [
                { "text": "我：不太懂，只知道有加密。", "suspicion": 0 },
                { "text": "我：知道一些，但不是很深入。", "suspicion": 5 },
                { "text": "我：我了解全盘加密和文件加密的区别。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的蓝牙连接稳定性可能会下降，你介意吗？",
            "answers": [
                { "text": "我：不介意，我蓝牙用得少。", "suspicion": 0 },
                { "text": "我：那连接蓝牙耳机听歌会卡吗？", "suspicion": -5 },
                { "text": "我：我有其他蓝牙适配器。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有尝试过刷第三方Recovery？",
            "answers": [
                { "text": "我：没有，不敢自己弄。", "suspicion": 0 },
                { "text": "我：想过，但没找到教程。", "suspicion": 5 },
                { "text": "我：是的，我刷过TWRP。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机可能会出现一些小毛病，比如偶尔卡顿，你能接受吗？",
            "answers": [
                { "text": "我：可以接受，只要比现在好。", "suspicion": 0 },
                { "text": "我：那不就没意义了吗？", "suspicion": -5 },
                { "text": "我：这些小问题我都能自己优化。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的驱动程序有了解吗？",
            "answers": [
                { "text": "我：不太了解，电脑上才用驱动吧？", "suspicion": 0 },
                { "text": "我：知道一些，但不多。", "suspicion": 5 },
                { "text": "我：我经常自己找驱动刷入。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的传感器校准可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我用得少。", "suspicion": 0 },
                { "text": "我：那指南针还能用吗？", "suspicion": -5 },
                { "text": "我：我可以自己校准。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你是不是想自己动手编译ROM？",
            "answers": [
                { "text": "我：没有，不敢尝试。", "suspicion": 0 },
                { "text": "我：想过，但太难了。", "suspicion": 5 },
                { "text": "我：是的，我已经开始学习了。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的振动马达可能会出现异常，你介意吗？",
            "answers": [
                { "text": "我：不介意，我很少用振动。", "suspicion": 0 },
                { "text": "我：会影响震动提醒吗？", "suspicion": -5 },
                { "text": "我：振动马达可以更换。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的ADB命令有了解吗？",
            "answers": [
                { "text": "我：不太了解，只知道是调试工具。", "suspicion": 0 },
                { "text": "我：略懂一二，用过几次。", "suspicion": 10 },
                { "text": "我：我经常用ADB刷机和调试。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的充电速度可能会变慢，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以慢慢充。", "suspicion": 0 },
                { "text": "我：会变慢很多吗？", "suspicion": -5 },
                { "text": "我：我有快充头，没关系。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有关注过这个手机型号的刷机教程？",
            "answers": [
                { "text": "我：看过一些，但没动手。", "suspicion": 0 },
                { "text": "我：没有，直接来找您了。", "suspicion": -5 },
                { "text": "我：我几乎看遍了所有教程。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的通话质量可能会下降，你介意吗？",
            "answers": [
                { "text": "我：不介意，我主要用微信通话。", "suspicion": 0 },
                { "text": "我：会很明显吗？", "suspicion": -5 },
                { "text": "我：我可以用VoLTE。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的SPL或者S-OFF有了解吗？",
            "answers": [
                { "text": "我：不太懂，那是HTC的吧？", "suspicion": 0 },
                { "text": "我：知道一些，但不是很清楚。", "suspicion": 10 },
                { "text": "我：是的，我已经搞定了。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的存储读写速度可能会有变化，你介意吗？",
            "answers": [
                { "text": "我：不介意，感觉不出来。", "suspicion": 0 },
                { "text": "我：会变慢很多吗？", "suspicion": -5 },
                { "text": "我：我平时不跑分，没关系。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有自己制作过手机配件？",
            "answers": [
                { "text": "我：没有，不会那些。", "suspicion": 0 },
                { "text": "我：想过，但没动手。", "suspicion": 5 },
                { "text": "我：是的，我做过一些外壳和散热器。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的扬声器音量可能会变小，你介意吗？",
            "answers": [
                { "text": "我：不介意，我平时用耳机。", "suspicion": 0 },
                { "text": "我：会变小很多吗？", "suspicion": -5 },
                { "text": "我：我可以自己调整音量增益。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的System分区和Data分区有了解吗？",
            "answers": [
                { "text": "我：不太了解，知道是系统和用户数据。", "suspicion": 0 },
                { "text": "我：知道一些，但不是很深入。", "suspicion": 10 },
                { "text": "我：我经常刷机，对分区很熟。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的屏幕亮度可能会有变化，你介意吗？",
            "answers": [
                { "text": "我：不介意，可以自己调。", "suspicion": 0 },
                { "text": "我：会变得很暗吗？", "suspicion": -5 },
                { "text": "我：我可以自己校准屏幕。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己维修手机？",
            "answers": [
                { "text": "我：没有，怕弄坏。", "suspicion": 0 },
                { "text": "我：想过，但没工具。", "suspicion": 5 },
                { "text": "我：是的，我经常自己修。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的闪光灯功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用闪光灯。", "suspicion": 0 },
                { "text": "我：那手电筒还能用吗？", "suspicion": -5 },
                { "text": "我：这个可以自己修复。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Fastboot模式有了解吗？",
            "answers": [
                { "text": "我：知道是刷机模式。", "suspicion": 0 },
                { "text": "我：不太懂，有什么用？", "suspicion": -5 },
                { "text": "我：我经常用Fastboot刷机。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的SIM卡识别可能会有问题，你介意吗？",
            "answers": [
                { "text": "我：不介意，我有备用机。", "suspicion": 0 },
                { "text": "我：那不能打电话了吗？", "suspicion": -5 },
                { "text": "我：我会自己检查基带。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你有没有想过刷机失败的后果？",
            "answers": [
                { "text": "我：想过，所以才找专业人士。", "suspicion": 0 },
                { "text": "我：那手机就报废了吗？", "suspicion": -5 },
                { "text": "我：再买一部新的就行了。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：刷机后手机的振动强度可能会减弱，你介意吗？",
            "answers": [
                { "text": "我：不介意，只要有振动就行。", "suspicion": 0 },
                { "text": "我：会变得很弱吗？", "suspicion": -5 },
                { "text": "我：我可以自己调整振动强度。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Kernel（内核）有了解吗？",
            "answers": [
                { "text": "我：知道是系统的核心。", "suspicion": 0 },
                { "text": "我：不太懂，那是什么？", "suspicion": -5 },
                { "text": "我：我经常刷第三方内核来优化。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的信号强度可能会下降，你介意吗？",
            "answers": [
                { "text": "我：不介意，我家信号很好。", "suspicion": 0 },
                { "text": "我：那打电话会断吗？", "suspicion": -5 },
                { "text": "我：我可以自己刷基带解决。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你有没有尝试过其他刷机方式？",
            "answers": [
                { "text": "我：没有，第一次刷机。", "suspicion": 0 },
                { "text": "我：尝试过，但没成功。", "suspicion": 10 },
                { "text": "我：各种方式都试过，包括卡刷线刷。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的自动亮度调节可能会不准确，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以手动调节。", "suspicion": 0 },
                { "text": "我：那很麻烦啊。", "suspicion": -5 },
                { "text": "我：我可以自己校准传感器。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的EFS分区有了解吗？",
            "answers": [
                { "text": "我：不太了解，好像很重要。", "suspicion": 0 },
                { "text": "我：知道是存放IMEI等信息的。", "suspicion": 10 },
                { "text": "我：我已经备份好了。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的屏幕色彩可能会有偏差，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不是专业人士。", "suspicion": 0 },
                { "text": "我：会变得很严重吗？", "suspicion": -5 },
                { "text": "我：我可以自己调整屏幕色温。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己开个手机维修店？",
            "answers": [
                { "text": "我：没有，没那个技术。", "suspicion": 0 },
                { "text": "我：想过，但资金不够。", "suspicion": 5 },
                { "text": "我：是的，我正在考虑中。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的WLAN热点功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用热点。", "suspicion": 0 },
                { "text": "我：那我的平板电脑怎么办？", "suspicion": -5 },
                { "text": "我：我可以自己刷入热点补丁。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Xposed框架有了解吗？",
            "answers": [
                { "text": "我：不太了解，只知道是模块。", "suspicion": 0 },
                { "text": "我：知道可以修改系统功能。", "suspicion": 10 },
                { "text": "我：我经常用Xposed模块。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的蓝牙连接距离可能会变短，你介意吗？",
            "answers": [
                { "text": "我：不介意，我蓝牙设备都在身边。", "suspicion": 0 },
                { "text": "我：会短很多吗？", "suspicion": -5 },
                { "text": "我：我可以自己更换蓝牙模块。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过给手机刷双系统？",
            "answers": [
                { "text": "我：没有，太复杂了。", "suspicion": 0 },
                { "text": "我：想过，但怕不稳定。", "suspicion": 10 },
                { "text": "我：是的，我打算刷WinPhone和安卓双系统。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的重力感应器可能会不准确，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不玩重力感应游戏。", "suspicion": 0 },
                { "text": "我：那横屏还会自动切换吗？", "suspicion": -5 },
                { "text": "我：我可以自己校准传感器。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Magisk有了解吗？",
            "answers": [
                { "text": "我：不太了解，只知道是Root工具。", "suspicion": 0 },
                { "text": "我：知道可以无痛Root和隐藏Root。", "suspicion": 15 },
                { "text": "我：我经常用Magisk刷模块。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的距离传感器可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以手动按键熄屏。", "suspicion": 0 },
                { "text": "我：那打电话屏幕不会灭吗？", "suspicion": -5 },
                { "text": "我：我可以自己修复。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己写个ROM？",
            "answers": [
                { "text": "我：没有，那太难了。", "suspicion": 0 },
                { "text": "我：想过，但没时间。", "suspicion": 5 },
                { "text": "我：是的，我正在学习安卓源码。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的指南针功能可能会不准确，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不常用指南针。", "suspicion": 0 },
                { "text": "我：那导航会受影响吗？", "suspicion": -5 },
                { "text": "我：我可以自己校准。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的基带（Baseband）有了解吗？",
            "answers": [
                { "text": "我：不太了解，只知道和信号有关。", "suspicion": 0 },
                { "text": "我：知道是负责通信的固件。", "suspicion": 10 },
                { "text": "我：我经常刷基带来优化信号。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的录音功能可能会出现杂音，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用手机录音。", "suspicion": 0 },
                { "text": "我：那录音笔还能用吗？", "suspicion": -5 },
                { "text": "我：我可以自己调试麦克风。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己定制Recovery？",
            "answers": [
                { "text": "我：没有，没那个需求。", "suspicion": 0 },
                { "text": "我：想过，但没技术。", "suspicion": 5 },
                { "text": "我：是的，我定制过TWRP主题。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的陀螺仪功能可能会不准确，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不玩重力感应游戏。", "suspicion": 0 },
                { "text": "我：那玩赛车游戏会受影响吗？", "suspicion": -5 },
                { "text": "我：我可以自己校准。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的System on a Chip (SoC) 有了解吗？",
            "answers": [
                { "text": "我：不太了解，知道是芯片。", "suspicion": 0 },
                { "text": "我：知道是集成了CPU、GPU的芯片。", "suspicion": 10 },
                { "text": "我：我研究过不同SoC的性能和功耗。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的自动旋转功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以手动切换。", "suspicion": 0 },
                { "text": "我：那看视频不方便了。", "suspicion": -5 },
                { "text": "我：我可以自己修复。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己搭建刷机环境？",
            "answers": [
                { "text": "我：没有，太麻烦了。", "suspicion": 0 },
                { "text": "我：想过，但电脑配置不够。", "suspicion": 5 },
                { "text": "我：是的，我家里有Linux服务器专门用来编译ROM。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的麦克风灵敏度可能会下降，你介意吗？",
            "answers": [
                { "text": "我：不介意，我很少录音。", "suspicion": 0 },
                { "text": "我：那打电话对方听不清怎么办？", "suspicion": -5 },
                { "text": "我：我可以自己更换麦克风。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Dalvik/ART运行时有了解吗？",
            "answers": [
                { "text": "我：不太了解，知道是运行环境。", "suspicion": 0 },
                { "text": "我：知道是安卓App的虚拟机。", "suspicion": 10 },
                { "text": "我：我研究过它们对App性能的影响。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的听筒音量可能会变小，你介意吗？",
            "answers": [
                { "text": "我：不介意，我可以开外放。", "suspicion": 0 },
                { "text": "我：那打电话听不清怎么办？", "suspicion": -5 },
                { "text": "我：我可以自己调整音量。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己做手机App？",
            "answers": [
                { "text": "我：没有，我不是程序员。", "suspicion": 0 },
                { "text": "我：想过，但没时间学习。", "suspicion": 5 },
                { "text": "我：是的，我写过几个小程序。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的振动模式可能会改变，你介意吗？",
            "answers": [
                { "text": "我：不介意，只要能振动就行。", "suspicion": 0 },
                { "text": "我：会变得很奇怪吗？", "suspicion": -5 },
                { "text": "我：我可以自己设置振动模式。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的Open GApps有了解吗？",
            "answers": [
                { "text": "我：不太了解，是谷歌服务吗？", "suspicion": 0 },
                { "text": "我：知道是第三方谷歌服务包。", "suspicion": 10 },
                { "text": "我：我经常根据需求选择不同的GApps包。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的相机闪退，你介意吗？",
            "answers": [
                { "text": "我：不介意，我用第三方相机。", "suspicion": 0 },
                { "text": "我：那拍照不方便了。", "suspicion": -5 },
                { "text": "我：我可以自己刷入相机驱动。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：你有没有想过给手机加装硬件？",
            "answers": [
                { "text": "我：没有，太难了。", "suspicion": 0 },
                { "text": "我：想过，但没技术。", "suspicion": 5 },
                { "text": "我：是的，我给手机加装过散热片和电池。", "suspicion": 25 }
            ]
        },
        {
            "question": "师傅：刷机后手机的红外功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用红外遥控。", "suspicion": 0 },
                { "text": "我：那家里的电器怎么遥控？", "suspicion": -5 },
                { "text": "我：我有独立的遥控器。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的APK签名有了解吗？",
            "answers": [
                { "text": "我：不太了解，知道App需要签名。", "suspicion": 0 },
                { "text": "我：知道签名可以验证App来源。", "suspicion": 10 },
                { "text": "我：我经常自己重新签名App。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的FM收音机功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用收音机。", "suspicion": 0 },
                { "text": "我：那听广播怎么办？", "suspicion": -5 },
                { "text": "我：我可以用网络收音机。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你有没有想过自己更换手机屏幕？",
            "answers": [
                { "text": "我：没有，太麻烦了。", "suspicion": 0 },
                { "text": "我：想过，但怕弄坏。", "suspicion": 5 },
                { "text": "我：是的，我换过好几次了。", "suspicion": 15 }
            ]
        },
        {
            "question": "师傅：刷机后手机的OTG功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我不用OTG。", "suspicion": 0 },
                { "text": "我：那怎么连接U盘？", "suspicion": -5 },
                { "text": "我：我有无线传输设备。", "suspicion": 10 }
            ]
        },
        {
            "question": "师傅：你对手机的SELinux有了解吗？",
            "answers": [
                { "text": "我：不太了解，知道是安全机制。", "suspicion": 0 },
                { "text": "我：知道可以增强安卓系统安全。", "suspicion": 10 },
                { "text": "我：我经常修改SELinux策略。", "suspicion": 20 }
            ]
        },
        {
            "question": "师傅：刷机后手机的双击唤醒功能可能会失效，你介意吗？",
            "answers": [
                { "text": "我：不介意，我习惯按电源键。", "suspicion": 0 },
                { "text": "我：那很不方便啊。", "suspicion": -5 },
                { "text": "我：我可以自己刷入补丁。", "suspicion": 10 }
            ]
        }
    ]

    function getRandomDialogueQuestions(num) {
        const shuffled = [...dialogueData].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, num);
        // 内部选项也要打乱
        return selected.map(item => ({
            ...item,
            answers: item.answers.sort(() => 0.5 - Math.random())
        }));
    }

    function initializeDialogue() {
        suspicionValue = 0;
        currentDialogueIndex = 0;
        selectedDialogueQuestions = getRandomDialogueQuestions(5); // Select 5 random questions
        showDialogueQuestion();
        updateTechnicianVisuals(); // Initial visual state
    }

    const showDialogueQuestion = () => {
        if (currentDialogueIndex < selectedDialogueQuestions.length) {
            const dialogue = selectedDialogueQuestions[currentDialogueIndex];
            dialogueText.textContent = dialogue.question;

            // Clear previous options
            dialogueOptionsContainer.innerHTML = '';

            // Create buttons for each answer
            dialogue.answers.forEach(answer => {
                const button = document.createElement('button');
                button.classList.add('ui-button', 'dialogue-option-button'); // Add a specific class for dialogue buttons
                button.textContent = answer.text;
                button.addEventListener('click', () => {
                    playSFX('button-click.wav');
                    suspicionValue += answer.suspicion;
                    console.log(`Suspicion Value: ${suspicionValue}`);
                    currentDialogueIndex++;
                    showDialogueQuestion();
                });
                dialogueOptionsContainer.appendChild(button);
            });

            // Hide the original "继续" button
            // buttons.nextDialogue.style.display = 'none';
            updateTechnicianVisuals(); // Update visuals each time a new question is shown
        } else {
            // All dialogues finished, proceed to flashing screen
            switchScreen('flashing');
            startFlashingSequence();
        }
    };

    // --- Flashing Logic ---
    const progressBar = document.getElementById('progress-bar');
    const flashStatus = document.getElementById('flash-status');
    let flashingProcess;
    let canPullCable = false;
    let pullTimer;

    const flashSteps = [
        { cmd: 'fastboot erase boot', duration: 2000 },
        { cmd: 'fastboot flash boot boot.img', duration: 3000 },
        { cmd: 'fastboot erase system', duration: 2000 },
        { cmd: 'fastboot flash system system.img', duration: 6000, critical: true },
        { cmd: 'fastboot flash recovery recovery.img', duration: 3000 },
        { cmd: 'fastboot reboot', duration: 1000, final: true },
    ];

    const startFlashingSequence = () => {
        let totalDuration = flashSteps.reduce((acc, step) => acc + step.duration, 0);
        let elapsedTime = 0;
        let stepIndex = 0;

        flashingProcess = setInterval(() => {
            elapsedTime += 100;
            progressBar.style.width = `${(elapsedTime / totalDuration) * 100}%`;

            if (elapsedTime >= flashSteps.slice(0, stepIndex + 1).reduce((acc, s) => acc + s.duration, 0)) {
                stepIndex++;
                if (stepIndex >= flashSteps.length) {
                    clearInterval(flashingProcess);
                    gameOver('太晚了!', '手机已经刷完并重启，Bootloader已重新上锁。');
                    return;
                }
            }

            const nextStep = flashSteps[stepIndex];
            flashStatus.textContent = `${nextStep.cmd}`;

            if (nextStep.critical && !canPullCable) {
                canPullCable = true;
                pullTimer = setTimeout(() => {
                    canPullCable = false;
                }, nextStep.duration + flashSteps[stepIndex + 1].duration - 500);
            }
        }, 100);
    };

    buttons.pullCable.addEventListener('click', () => {
        playSFX('button-click.wav');
        clearInterval(flashingProcess);
        clearTimeout(pullTimer);
        if (canPullCable) {
            switchScreen('escape');
            startEscapeSequence();
        } else {
            const lastCommand = flashStatus.textContent;
            if (lastCommand.includes('system')) {
                gameOver('太早了!', '你拔得太早了！手机现在成了一块漂亮的砖头。');
            } else if(lastCommand.includes(' boot')) {
                gameOver('太早了!', '刷机还没正式开始！你的计划暴露了。');
            } else {
                gameOver('太晚了!', '手机已经刷完并重启，Bootloader已重新上锁。')
            }
        }
    });

    // --- Escape Logic ---
    const canvas = document.getElementById('escape-canvas');
    const ctx = canvas.getContext('2d');

    let escapeAnimationId;
    let player, technician, target, obstacles, grid;
    let technicianMoveDelay = 1000;
    let technicianStarted = false;
    let technicianPath = [];
    let lastPathfindTime = 0;

    const keys = {
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
    };

    const GRID_SIZE = 17;
    let TILE_SIZE;

    const images = {};
    const imageSources = {
        player: 'assets/images/player-spritesheet.png',
        technician: 'assets/images/technician-spritesheet.png',
        plant: 'assets/images/obstacle-plant.png',
        bicycle: 'assets/images/obstacle-bicycle.png',
        ebike: 'assets/images/obstacle-ebike.png',
        targetEbike: 'assets/images/target-ebike.png',
        arrow: 'assets/images/ui-arrow.png'
    };

    function loadImages(callback) {
        let loadedImages = 0;
        const numImages = Object.keys(imageSources).length;
        for (const key in imageSources) {
            images[key] = new Image();
            images[key].src = imageSources[key];
            images[key].onload = () => {
                if (++loadedImages >= numImages) {
                    callback();
                }
            };
        }
    }

    function startEscapeSequence() {
        loadImages(() => {
            setupEscapeScene();
            gameLoop();
        });
    }

    function setupEscapeScene() {
        const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
        canvas.width = size;
        canvas.height = size;
        TILE_SIZE = canvas.width / GRID_SIZE;

        technicianStarted = false;
        technicianPath = [];
        lastPathfindTime = 0;

        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));

        const startCol = Math.floor(GRID_SIZE / 2);
        player = {
            x: startCol * TILE_SIZE + (TILE_SIZE / 2),
            y: (GRID_SIZE - 1) * TILE_SIZE + (TILE_SIZE / 2),
            size: TILE_SIZE * 0.8,
            speed: TILE_SIZE * 0.1, // Player's fixed speed
            spriteSheet: images.player,
            framesPerRow: 4, // Player sprite sheet has 4 frames per row
            rowsInSpritesheet: 6, // Player sprite sheet has 6 rows
            currentFrame: 0,
            maxFrame: 3,
            animationSpeed: 5,
            animationCounter: 0,
            direction: 'up',
            isMoving: false
        };
        player.spriteWidth = images.player.width / player.framesPerRow;
        player.spriteHeight = images.player.height / player.rowsInSpritesheet;

        // Adjust technician speed based on suspicionValue
        // Base speed + (suspicionValue / max_possible_suspicion) * speed_increase_factor
        const maxPossibleSuspicion = 20 * 3; // Max suspicion from 3 questions
        const speedIncreaseFactor = TILE_SIZE * 0.05; // Max additional speed for technician
        const technicianBaseSpeed = player.speed * 0.9;
        technician = {
            x: startCol * TILE_SIZE + (TILE_SIZE / 2),
            y: (GRID_SIZE - 2) * TILE_SIZE + (TILE_SIZE / 2),
            size: TILE_SIZE * 0.8,
            speed: technicianBaseSpeed + (suspicionValue / maxPossibleSuspicion) * speedIncreaseFactor,
            spriteSheet: images.technician,
            framesPerRow: 4, // Technician sprite sheet has 4 frames per row
            rowsInSpritesheet: 4, // Technician sprite sheet has 4 rows
            currentFrame: 0,
            maxFrame: 3,
            animationSpeed: 5,
            animationCounter: 0,
            direction: 'up',
            isMoving: false
        };
        technician.spriteWidth = images.technician.width / technician.framesPerRow;
        technician.spriteHeight = images.technician.height / technician.rowsInSpritesheet;

        setTimeout(() => { technicianStarted = true; }, technicianMoveDelay);

        obstacles = [];
        const numObstacles = 30;
        for (let i = 0; i < numObstacles; i++) {
            const col = Math.floor(Math.random() * GRID_SIZE);
            const row = Math.floor(Math.random() * (GRID_SIZE - 2));
            if (grid[row][col] === 0 && !(row === GRID_SIZE - 1 && col === startCol)) {
                const type = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'bicycle' : 'ebike') : 'plant';
                const img = images[type];
                const width = (type === 'bicycle' || type === 'ebike') ? TILE_SIZE * 1.5 : TILE_SIZE;
                const height = TILE_SIZE;
                if (col + (width / TILE_SIZE) < GRID_SIZE) {
                    obstacles.push({ x: col * TILE_SIZE, y: row * TILE_SIZE, width, height, img });
                    for (let w = 0; w < Math.ceil(width / TILE_SIZE); w++) {
                        if (col + w < GRID_SIZE) grid[row][col + w] = 1;
                    }
                }
            }
        }

        const targetCol = Math.floor(Math.random() * GRID_SIZE);
        target = {
            x: targetCol * TILE_SIZE,
            y: 0,
            width: TILE_SIZE * 1.5,
            height: TILE_SIZE,
            img: images.targetEbike
        };
        grid[0][targetCol] = 0;
        if (targetCol + 1 < GRID_SIZE) grid[0][targetCol + 1] = 0;

        document.addEventListener('keydown', (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = true;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = false;
            }
        });
    }

    function gameLoop() {
        update();
        draw();
        escapeAnimationId = requestAnimationFrame(gameLoop);
    }

    function update() {
        let dx = 0;
        let dy = 0;
        player.isMoving = false;

        if (keys.w || keys.ArrowUp) { dy = -1; player.direction = 'up'; player.isMoving = true; }
        if (keys.s || keys.ArrowDown) { dy = 1; player.direction = 'down'; player.isMoving = true; }
        if (keys.a || keys.ArrowLeft) { dx = -1; player.direction = 'left'; player.isMoving = true; }
        if (keys.d || keys.ArrowRight) { dx = 1; player.direction = 'right'; player.isMoving = true; }

        if (player.isMoving) {
            let newX = player.x + dx * player.speed;
            let newY = player.y + dy * player.speed;

            if (newX - player.size / 2 < 0) newX = player.size / 2;
            if (newX + player.size / 2 > canvas.width) newX = canvas.width - player.size / 2;
            if (newY - player.size / 2 < 0) newY = player.size / 2;
            if (newY + player.size / 2 > canvas.height) newY = canvas.height - player.size / 2;

            let collided = false;
            const playerRect = { x: newX - player.size / 2, y: newY - player.size / 2, width: player.size, height: player.size };
            for (const obs of obstacles) {
                if (checkCollision(playerRect, obs)) {
                    collided = true;
                    break;
                }
            }
            if (!collided) {
                player.x = newX;
                player.y = newY;
            }

            player.animationCounter++;
            if (player.animationCounter % player.animationSpeed === 0) {
                player.currentFrame = (player.currentFrame + 1) % player.maxFrame;
            }
        } else {
            player.currentFrame = 0;
        }

        if (technicianStarted) {
            const now = Date.now();
            if (now - lastPathfindTime > 500) {
                lastPathfindTime = now;
                const startNode = { x: Math.floor(technician.x / TILE_SIZE), y: Math.floor(technician.y / TILE_SIZE) };
                const endNode = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
                technicianPath = aStar(startNode, endNode, grid);
            }

            technician.isMoving = false;
            if (technicianPath && technicianPath.length > 0) {
                const nextStep = technicianPath[0];
                const targetX = nextStep.x * TILE_SIZE + TILE_SIZE / 2;
                const targetY = nextStep.y * TILE_SIZE + TILE_SIZE / 2;
                const techDx = targetX - technician.x;
                const techDy = targetY - technician.y;
                const techDist = Math.sqrt(techDx * techDx + techDy * techDy);

                if (techDist > 1) {
                    technician.isMoving = true;
                    if (Math.abs(techDx) > Math.abs(techDy)) {
                        technician.direction = techDx > 0 ? 'right' : 'left';
                    } else {
                        technician.direction = techDy > 0 ? 'down' : 'up';
                    }
                }

                if (techDist < technician.speed) {
                    technician.x = targetX;
                    technician.y = targetY;
                    technicianPath.shift();
                } else {
                    technician.x += (techDx / techDist) * technician.speed;
                    technician.y += (techDy / techDist) * technician.speed;
                }
            }

            if (technician.isMoving) {
                technician.animationCounter++;
                if (technician.animationCounter % technician.animationSpeed === 0) {
                    technician.currentFrame = (technician.currentFrame + 1) % technician.maxFrame;
                }
            } else {
                technician.currentFrame = 0;
            }
        }

        const playerRect = { x: player.x - player.size / 2, y: player.y - player.size / 2, width: player.size, height: player.size };
        const techRect = { x: technician.x - technician.size / 2, y: technician.y - technician.size / 2, width: technician.size, height: technician.size };

        if (technicianStarted && checkCollision(playerRect, techRect)) {
            cancelAnimationFrame(escapeAnimationId);
            gameOver("你被抓住了!", "你跑得太慢了，被师傅抓住了。下次好运！");
        }

        if (checkCollision(playerRect, target)) {
            cancelAnimationFrame(escapeAnimationId);
            victory();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        obstacles.forEach(obs => ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height));
        ctx.drawImage(images.targetEbike, target.x, target.y, target.width, target.height);

        const arrowX = target.x + target.width / 2 - TILE_SIZE / 2;
        const arrowY = target.y + target.height + Math.sin(Date.now() / 200) * 5;
        ctx.drawImage(images.arrow, arrowX, arrowY, TILE_SIZE, TILE_SIZE);

        drawCharacter(player);
        if (technicianStarted) {
            drawCharacter(technician);
        }
    }

    function drawCharacter(char) {
        const directionOrder = { 'down': 0, 'left': 1, 'right': 2, 'up': 3 };
        const frameX = char.currentFrame * char.spriteWidth;
        const frameY = directionOrder[char.direction] * char.spriteHeight;
        ctx.drawImage(
            char.spriteSheet,
            frameX, frameY, char.spriteWidth, char.spriteHeight,
            char.x - char.size / 2, char.y - char.size / 2, char.size, char.size
        );
    }

    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function aStar(start, end, grid) {
        const openSet = [];
        const closedSet = [];
        const rows = grid.length;
        const cols = grid[0].length;

        const nodes = Array(rows).fill(null).map((_, i) => Array(cols).fill(null).map((_, j) => ({
            x: j, y: i, f: 0, g: 0, h: 0,
            previous: undefined,
            wall: grid[i][j] === 1
        })));

        if (start.y < 0 || start.y >= rows || start.x < 0 || start.x >= cols ||
            end.y < 0 || end.y >= rows || end.x < 0 || end.x >= cols ||
            nodes[start.y][start.x].wall || nodes[end.y][end.x].wall) {
            return [];
        }

        openSet.push(nodes[start.y][start.x]);

        while (openSet.length > 0) {
            let winner = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[winner].f) {
                    winner = i;
                }
            }
            const current = openSet[winner];

            if (current.x === end.x && current.y === end.y) {
                const path = [];
                let temp = current;
                path.push(temp);
                while (temp.previous) {
                    path.push(temp.previous);
                    temp = temp.previous;
                }
                return path.reverse();
            }

            openSet.splice(winner, 1);
            closedSet.push(current);

            const neighbors = [];
            const { x, y } = current;
            if (y > 0) neighbors.push(nodes[y - 1][x]);
            if (y < rows - 1) neighbors.push(nodes[y + 1][x]);
            if (x > 0) neighbors.push(nodes[y][x - 1]);
            if (x < cols - 1) neighbors.push(nodes[y][x + 1]);

            for (const neighbor of neighbors) {
                if (!closedSet.includes(neighbor) && !neighbor.wall) {
                    const tempG = current.g + 1;
                    let newPath = false;
                    if (openSet.includes(neighbor)) {
                        if (tempG < neighbor.g) {
                            neighbor.g = tempG;
                            newPath = true;
                        }
                    } else {
                        neighbor.g = tempG;
                        newPath = true;
                        openSet.push(neighbor);
                    }

                    if (newPath) {
                        neighbor.h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
                        neighbor.f = neighbor.g + neighbor.h;
                        neighbor.previous = current;
                    }
                }
            }
        }
        return [];
    }

    const gameOverTitle = document.getElementById('game-over-title');
    const gameOverMessage = document.getElementById('game-over-message');

    const gameOver = (title, message) => {
        const finished = localStorage.getItem('hasFinished');
        if (finished === 'true') {
            return;
        }
        // 记录已完成状态
        localStorage.setItem('hasFinished', 'true');
        playSFX('failure.wav');
        gameOverTitle.textContent = title;
        gameOverMessage.textContent = message;
        switchScreen('gameOver');
    };

    const victory = () => {
        const finished = localStorage.getItem('hasFinished');
        if (finished === 'true') {
            return;
        }
        // 记录已完成状态
        localStorage.setItem('hasFinished', 'true');
        playSFX('success.wav');
        switchScreen('victory');
    };

    function resetGame() {
        dialogueIndex = 0;
        progressBar.style.width = '0%';
        flashStatus.textContent = '';
        // 重置已完成状态
        localStorage.setItem('hasFinished', 'false');
        canPullCable = false;
        if (flashingProcess) clearInterval(flashingProcess);
        if (pullTimer) clearTimeout(pullTimer);
        if (escapeAnimationId) {
            cancelAnimationFrame(escapeAnimationId);
            escapeAnimationId = null;
        }
        // Reset keys
        for (const key in keys) {
            keys[key] = false;
        }
        suspicionValue = 0; // Reset suspicion value
        selectedDialogueQuestions = []; // Clear selected questions
    };

    switchScreen('mainMenu');
});