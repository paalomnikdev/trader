const TelegramBot = require('node-telegram-bot-api');
const Cryptopia = require('cryptopia-api')();
const config = require('./config.json');
Cryptopia.setOptions(config.cryptopia);
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(config.telegram.botToken, {polling: true});

setInterval(() => checkPrices(), 60000);

bot.onText(/\/checktrades/, (msg) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        config.trades.forCheck.forEach((pair) => {
            Cryptopia.getOpenOrders({Market: pair, Count: 10})
                .then((openOrders) => {
                    let result = [];
                    if (openOrders.Success) {
                        openOrders.Data.forEach((trade) => {
                            result.push(
                                trade.Type + ' ' + trade.Market + ' Rate:' + trade.Rate + ' Amount:' + trade.Amount + ' Total:' + trade.Total + ' Remaining:' + trade.Remaining
                            );
                        });
                    }

                    if (!result.length) {
                        return bot.sendMessage(chatId, 'No trades.');
                    }

                    return bot.sendMessage(chatId, result.join("\n"));
                });
        });
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        bot.sendMessage(chatId, getHelpMessage());
    }
});

bot.onText(/\/checkbalances/, (msg) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        config.balances.forCheck.forEach((currency) => {
            Cryptopia.getBalance({Currency: currency.toUpperCase()})
                .then((resp) => {
                    if (resp.Success && resp.Data[0]) {
                        let data = resp.Data[0];
                        bot.sendMessage(
                            chatId,
                            data.Symbol + ' Total:' + data.Total + ' Available:' + data.Available + ' HeldForTrades:' + data.HeldForTrades
                        )
                    }
                });
        });
    }
});

bot.onText(/\/checkmarkets/, (msg) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        config.notifyLimits.forEach((item) => {
            Cryptopia.getMarket({Market: item.pair, Hours: 4})
                .then((resp) => {
                    if (resp.Success) {
                        let data = resp.Data;
                        bot.sendMessage(
                            chatId,
                            data.Label + ' Max sell price:' + data.AskPrice + ' Max buy price:' + data.BidPrice
                        );
                    }
                });
        });
    }
});

bot.onText(/\/notifications (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        if (match[1] === 'on') {
            config.telegram.notificationsEnabled = true;
            return bot.sendMessage(chatId, 'Notifications enabled.');
        }
        config.telegram.notificationsEnabled = false;
        return bot.sendMessage(chatId, 'Notifications disabled.');
    }
});

function checkPrices () {
    if (config.telegram.notificationsEnabled) {
        config.notifyLimits.forEach((item) => {
            Cryptopia.getMarket({Market: item.pair, Hours: 4})
                .then((resp) => {
                    if (resp.Success) {
                        let data = resp.Data;
                        if (resp.Data.AskPrice <= item.downLimit || resp.Data.AskPrice >= item.highLimit) {
                            bot.sendMessage(
                                chatId,
                                '!!!!' + data.Label + '!!!!' + data.AskPrice
                            )
                        }
                    }
                });
        });
    }
}

function checkMaster(chatId) {
    if (chatId !== config.telegram.chatId) {
        bot.sendPhoto(chatId, `${__dirname}/dosvidanya.jpg`, {
            caption: 'Bye-bye.'
        });
        return false;
    }

    return true;
}

function getHelpMessage() {
    let help = [
        '/checktrades - Check current opened trades.',
        '/checkbalances - Check current balances.',
        '/checkmarkets - Check current markets.',
        '/notifications on|off - Notifications control.',
    ];

    return help.join("\n");
}

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (checkMaster(chatId)) {
        // bot.sendMessage(chatId, getHelpMessage());
    }
});