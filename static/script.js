document.addEventListener('DOMContentLoaded', function() {
    const balanceSpan = document.getElementById('balance');
    const openCaseButton = document.getElementById('open-case-button');
    const showBetsButton = document.getElementById('show-bets-button');
    const leaderboardButton = document.getElementById('leaderboard-button'); // Новая кнопка "Лидеры"
    const caseSection = document.getElementById('case-section');
    const betsSection = document.getElementById('bets-section');
    const leaderboardSection = document.getElementById('leaderboard-section'); // Секция с таблицей лидеров
    const driverSelect = document.getElementById('driver-select');
    const placeBetButton = document.getElementById('place-bet-button');
    const betAmountInput = document.getElementById('bet-amount');
    const betsItemsDiv = document.getElementById('bets-items');
    const raceInfoText = document.getElementById('race-info-text');
    const oddsDisplay = document.getElementById('odds-value');
    const winningsDisplay = document.getElementById('winnings-value');
    const betSlider = document.getElementById('bet-slider');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');

    let balance = parseInt(balanceSpan.textContent);

    // Переключение между секциями
    showBetsButton.addEventListener('click', function() {
        caseSection.style.display = 'none';
        betsSection.style.display = 'block';
        leaderboardSection.style.display = 'none';
        loadRaceAndDrivers();
        loadUserBets();
    });

    openCaseButton.addEventListener('click', function() {
        caseSection.style.display = 'block';
        betsSection.style.display = 'none';
        leaderboardSection.style.display = 'none';
    });

    // Логика открытия кейсов
    const animationDiv = document.getElementById('animation');
    const animationStrip = document.getElementById('animation-strip');
    const resultDiv = document.getElementById('result');

    openCaseButton.addEventListener('click', async function() {
        if (balance < 10) {
            alert('Недостаточно монет для открытия кейса.');
            return;
        }

        openCaseButton.disabled = true;
        showBetsButton.disabled = true;
        resultDiv.textContent = '';
        animationDiv.style.display = 'block';
        animationStrip.style.transform = 'translateX(0)';
        animationStrip.innerHTML = '';

        // Анимация открытия кейса
        const items = [
            { name: 'Williams FW14B', rarity: 'Обычный' },
            { name: 'McLaren MP4/8A', rarity: 'Редкий' },
            { name: 'Ferrari F2002', rarity: 'Эпический' },
            { name: 'Mercedes W196R', rarity: 'Легендарный' }
        ];

        const animationItems = [];
        for (let i = 0; i < 20; i++) {
            animationItems.push(items[Math.floor(Math.random() * items.length)]);
        }

        animationItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('animation-item');
            itemDiv.setAttribute('data-rarity', item.rarity);

            const name = document.createElement('span');
            name.textContent = item.name;

            itemDiv.appendChild(name);
            animationStrip.appendChild(itemDiv);
        });

        // Запуск анимации
        setTimeout(() => {
            const totalWidth = animationStrip.offsetWidth;
            const targetPosition = -((totalWidth / 2) - (animationDiv.offsetWidth / 2));
            animationStrip.style.transition = 'transform 5s cubic-bezier(0.05, 0.15, 0.2, 1)';
            animationStrip.style.transform = `translateX(${targetPosition}px)`;
        }, 100);

        // Запрос на сервер для открытия кейса
        const response = await fetch('/open_case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();

        // Обновление баланса
        balance -= 10;
        balanceSpan.textContent = balance;

        // Завершение анимации и отображение результата
        setTimeout(() => {
            animationDiv.style.display = 'none';
            resultDiv.textContent = `Вы получили: ${data.item} (${data.rarity})`;
            openCaseButton.disabled = false;
            showBetsButton.disabled = false;
        }, 5000); // Задержка в 5 секунд перед завершением
    });

    // Логика ставок
    async function loadRaceAndDrivers() {
        raceInfoText.textContent = 'Загрузка информации о гонке...';
        const response = await fetch('/get_race_and_drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();

        if (data.error) {
            raceInfoText.textContent = data.error;
        } else {
            raceInfoText.textContent = `Гонка: ${data.race_name} | Дата: ${data.race_date}`;

            driverSelect.innerHTML = '';
            data.drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.driver_id;
                option.textContent = `${driver.givenName} ${driver.familyName} (Место: ${driver.position})`;
                option.dataset.odds = driver.odds;
                driverSelect.appendChild(option);
            });

            // Обновление коэффициентов при выборе гонщика
            driverSelect.addEventListener('change', updateOddsAndWinnings);
            betAmountInput.addEventListener('input', updateOddsAndWinnings);
            betSlider.addEventListener('input', updateSliderAndWinnings);

            // Инициализировать с текущим выбранным гонщиком
            updateOddsAndWinnings();
        }
    }

    placeBetButton.addEventListener('click', async function() {
        const driverId = driverSelect.value;
        const selectedOption = driverSelect.options[driverSelect.selectedIndex];
        const driverName = selectedOption.textContent;
        const amount = parseInt(betAmountInput.value);

        if (isNaN(amount) || amount <= 0) {
            alert('Введите корректную сумму ставки.');
            return;
        }

        if (amount > balance) {
            alert('Недостаточно монет для ставки.');
            return;
        }

        const response = await fetch('/place_bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, driver_id: driverId, driver_name: driverName, amount: amount })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            balance = data.new_balance;
            balanceSpan.textContent = balance;
            betAmountInput.value = '';
            betSlider.value = '';
            oddsDisplay.textContent = '-';
            winningsDisplay.textContent = '-';
            loadUserBets();
        }
    });

    function updateOddsAndWinnings() {
        const selectedOption = driverSelect.options[driverSelect.selectedIndex];
        const odds = parseFloat(selectedOption.dataset.odds);
        const amount = parseInt(betAmountInput.value);

        oddsDisplay.textContent = odds.toFixed(2);

        if (!isNaN(amount) && amount > 0) {
            const potentialWinnings = odds * amount;
            winningsDisplay.textContent = potentialWinnings.toFixed(2);
            betSlider.value = amount;
        } else {
            winningsDisplay.textContent = '-';
        }
    }

    function updateSliderAndWinnings() {
        betAmountInput.value = betSlider.value;
        updateOddsAndWinnings();
    }

    async function loadUserBets() {
        const response = await fetch('/get_user_bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();

        betsItemsDiv.innerHTML = '';

        if (data.bets.length === 0) {
            betsItemsDiv.textContent = 'У вас нет активных ставок.';
            return;
        }

        data.bets.forEach(bet => {
            const betDiv = document.createElement('div');
            betDiv.classList.add('bet-item');
            betDiv.textContent = `Ставка: ${bet.amount} монет на гонщика ${bet.driver_name} с коэффициентом ${bet.odds}`;
            betsItemsDiv.appendChild(betDiv);
        });
    }

    // Функция для загрузки таблицы лидеров
    async function loadLeaderboard() {
        const response = await fetch('/get_leaderboard', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        leaderboardTableBody.innerHTML = '';

        data.leaders.forEach((leader, index) => {
            const row = document.createElement('tr');
            const rankCell = document.createElement('td');
            const userCell = document.createElement('td');
            const balanceCell = document.createElement('td');

            rankCell.textContent = index + 1;
            userCell.textContent = leader.username; // Используем имя пользователя
            balanceCell.textContent = leader.balance;

            row.appendChild(rankCell);
            row.appendChild(userCell);
            row.appendChild(balanceCell);

            leaderboardTableBody.appendChild(row);
        });
    }

    // Логика для ползунка суммы ставки
    betAmountInput.addEventListener('input', function() {
        const amount = parseInt(betAmountInput.value);
        if (!isNaN(amount)) {
            betSlider.value = amount;
        }
        updateOddsAndWinnings();
    });

    betSlider.addEventListener('input', function() {
        betAmountInput.value = betSlider.value;
        updateOddsAndWinnings();
    });

    // Инициализация ползунка при загрузке
    betSlider.min = 1;
    betSlider.max = balance;
    betSlider.value = betAmountInput.value;

    // Обновляем максимальное значение ползунка при изменении баланса
    function updateBetSliderMax() {
        betSlider.max = balance;
    }

    // Вызываем функцию при изменении баланса
    function updateBalance(newBalance) {
        balance = newBalance;
        balanceSpan.textContent = balance;
        updateBetSliderMax();
    }

    // Добавление логики для кнопки "Лидеры"
    leaderboardButton.addEventListener('click', function() {
        caseSection.style.display = 'none';
        betsSection.style.display = 'none';
        leaderboardSection.style.display = 'block';  // Отображаем таблицу лидеров
        loadLeaderboard();  // Загружаем таблицу лидеров
    });

    // Добавление логики для сворачивания клавиатуры после нажатия на "Enter"
    betAmountInput.addEventListener('keydown', function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            this.blur(); // Убираем фокус с поля для ввода суммы ставки
        }
    });
});
