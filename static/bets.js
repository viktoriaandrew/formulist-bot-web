document.addEventListener('DOMContentLoaded', function() {
    const balanceSpan = document.getElementById('balance');
    const placeBetButton = document.getElementById('place-bet-button');
    const driverSelect = document.getElementById('driver-select');
    const betAmountInput = document.getElementById('bet-amount');
    const betsListDiv = document.getElementById('bets-list');

    let balance = parseInt(balanceSpan.textContent);

    placeBetButton.addEventListener('click', async function() {
        const driverId = driverSelect.value;
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
            body: JSON.stringify({ user_id: userId, driver_id: driverId, amount: amount })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            balance = data.new_balance;
            balanceSpan.textContent = balance;
            betAmountInput.value = '';
            loadUserBets();
        }
    });

    async function loadUserBets() {
        const response = await fetch('/get_user_bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();

        betsListDiv.innerHTML = '';

        if (data.bets.length === 0) {
            betsListDiv.textContent = 'У вас нет активных ставок.';
            return;
        }

        data.bets.forEach(bet => {
            const betDiv = document.createElement('div');
            betDiv.classList.add('bet-item');
            betDiv.textContent = `Ставка ${bet.bet_id}: ${bet.amount} монет на гонщика ${bet.driver_id} с коэффициентом ${bet.odds}`;
            betsListDiv.appendChild(betDiv);
        });
    }

    // Загрузка активных ставок при загрузке страницы
    loadUserBets();
});
