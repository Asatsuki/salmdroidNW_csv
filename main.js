var outputUrl;
let options;
const enemies = ["バクダン", "カタパッド", "テッパン", "ヘビ", "タワー", "モグラ", "コウモリ", "ハシラ", "ダイバー", "テッキュウ", "ナベブタ",
    "キンシャケ", "グリル", "ドロシャケ"];
const resultPath = "1";

// カラム取得部分
class ColumnGetter {
    constructor() { }
    getData(coopHistory) { }
    getHeader() { }
    dotWalk(obj, address) {
        let current = obj;
        let dotList = address.split(".");
        dotList.forEach(element => {
            if (current != null) {
                current = current[element];
            }
            else {
                return [""];
            }
        });
        return [current];
    }
}

class ColumnGetterSimple extends ColumnGetter {
    constructor(key, label) {
        super();
        this.key = key;
        this.label = label;
    }
    getData(coopHistory) {
        return [this.dotWalk(coopHistory, this.key)];
    }
    getHeader() { return [this.label]; }
}

class ColumnGetterWave extends ColumnGetter {
    constructor(key, label, includeEx) {
        super();
        this.key = key;
        this.label = label;
        this.includeEx = includeEx;
    }
    getData(coopHistory) {
        let fields = [];
        let loops = this.includeEx ? 4 : 3;
        for (let i = 0; i < loops; i++) {
            fields.push(this.dotWalk(coopHistory["waveResults"][i], this.key));
        }
        return fields;
    }
    getHeader() {
        if (this.includeEx) {
            return [`${this.label}(W1)`, `${this.label}(W2)`, `${this.label}(W3)`, `${this.label}(EX)`];
        } else {
            return [`${this.label}(W1)`, `${this.label}(W2)`, `${this.label}(W3)`];
        }
    }
}

class ColumnGetterPlayer extends ColumnGetter {
    constructor(key, label) {
        super();
        this.key = key;
        this.label = label;
    }
    getData(coopHistory) {
        let players = [coopHistory["myResult"]];
        if (options.includeCoopPlayer) {
            for (let i = 0; i < 3; i++) {
                players.push(coopHistory["memberResults"][i]);
            }
        }
        let fields = [];

        players.forEach(player => {
            fields.push(this.dotWalk(player, this.key));
        });

        return fields;
    }
    getHeader() {
        if (options.includeCoopPlayer) {
            return [`${this.label}(自分)`, `${this.label}(2人目)`, `${this.label}(3人目)`, `${this.label}(4人目)`];
        } else {
            return [`${this.label}(自分)`];
        }
    }
}

class ColumnGetterEnemy extends ColumnGetter {
    constructor(key, label) {
        super();
        this.key = key;
        this.label = label;
    }
    getData(coopHistory) {
        let enemyResults = coopHistory["enemyResults"];
        let fields = [];
        enemies.forEach(enemy => {
            let enemyResult = enemyResults.find(element => element.enemy.name == enemy);
            if (enemyResult != null) {
                fields.push(this.dotWalk(enemyResult, this.key));
            } else {
                fields.push(0);
            }
        });
        return fields;
    }
    getHeader() {
        return enemies.map(enemy => `${this.label}(${enemy})`);
    }
}

const column_templates = {
    // バイトリザルト
    id: new ColumnGetterSimple("id", "バイトID"),
    playedTimeUTC: new ColumnGetterSimple("playedTime", "プレイ日時(UTC)"),
    dangerRate: new ColumnGetterSimple("dangerRate", "キケン度"),
    afterGrade: new ColumnGetterSimple("afterGrade.name", "称号"),
    afterGradePoint: new ColumnGetterSimple("afterGradePoint", "評価値"),
    smellMeter: new ColumnGetterSimple("smellMeter", "オカシラゲージ"),
    bossName: new ColumnGetterSimple("bossResult.boss.name", "出現オカシラシャケ"),
    bossDefeat: new ColumnGetterSimple("bossResult.hasDefeatBoss", "オカシラシャケを倒せたか"),
    playedTime: new class extends ColumnGetter {
        getData(coopHistory) {
            let dateRaw = coopHistory["playedTime"];
            let date = new Date(dateRaw);
            return [date.toLocaleString()];
        }
        getHeader() {
            return ["プレイ日時"];
        }
    }(),
    weapons: new class extends ColumnGetter {
        getData(coopHistory) {
            let fields = [];
            for (let i = 0; i < 4; i++) {
                fields.push(coopHistory["weapons"][i]["name"]);
            }
            return fields;
        }
        getHeader() {
            return ["ブキ編成1", "ブキ編成2", "ブキ編成3", "ブキ編成4"];
        }
    }(),
    goldenEgg: new class extends ColumnGetter {
        getData(coopHistory) {
            let count = 0;
            coopHistory["waveResults"].forEach(element => {
                count += element["teamDeliverCount"]
            })
            return [count];
        }
        getHeader() {
            return ["合計金イクラ"];
        }
    }(),
    egg: new class extends ColumnGetter {
        getData(coopHistory) {
            let count = coopHistory["myResult"]["deliverCount"];
            coopHistory.memberResults.forEach(element => {
                count += element["deliverCount"];
            })
            return [count];
        }
        getHeader() {
            return ["合計金イクラ"];
        }
    }(),
    clearWave: new class extends ColumnGetter {
        getData(coopHistory) {
            let resultWave = coopHistory["resultWave"];
            if (resultWave == 0) {
                return [3];
            }
            return [resultWave - 1];
        }
        getHeader() {
            return ["クリアしたWAVE数"];
        }
    }(),
    scale: new class extends ColumnGetter {
        getData(coopHistory) {
            let scale = coopHistory["scale"];
            if (scale != null) {
                return [scale["bronze"], scale["silver"], scale["gold"]];
            } else {
                return [null, null, null];
            }
        }
        getHeader() {
            return ["ウロコ(銅)", "ウロコ(銀)", "ウロコ(金)"];
        }
    }(),
    // クマサンポイント
    jobPoint: new ColumnGetterSimple("jobPoint", "獲得ポイント"),
    jobScore: new ColumnGetterSimple("jobScore", "バイトスコア"),
    jobRate: new ColumnGetterSimple("jobRate", "評価レート"),
    jobBonus: new ColumnGetterSimple("jobBonus", "クリアボーナス"),
    // WAVEごとのリザルト
    wave_deliver: new ColumnGetterWave("teamDeliverCount", "納品数", false),
    wave_norm: new ColumnGetterWave("deliverNorm", "ノルマ", false),
    wave_occurrence: new ColumnGetterWave("eventWave.name", "特殊な状況", false),
    wave_tide: new ColumnGetterWave("waterLevel", "潮位", true),
    wave_egg: new ColumnGetterWave("goldenPopCount", "金イクラ出現数", true),
    // プレイヤーリザルト
    player_defeat: new ColumnGetterPlayer("defeatEnemyCount", "オオモノ撃破数"),
    player_deliver: new ColumnGetterPlayer("goldenDeliverCount", "納品数"),
    player_assist: new ColumnGetterPlayer("goldenAssistCount", "納品アシスト数"),
    player_egg: new ColumnGetterPlayer("deliverCount", "赤イクラ数"),
    player_rescue: new ColumnGetterPlayer("rescueCount", "救出数"),
    player_rescued: new ColumnGetterPlayer("rescuedCount", "被救出数"),
    player_special: new ColumnGetterPlayer("specialWeapon.name", "配布スペシャル"),
    player_name: new ColumnGetterPlayer("player.name", "プレイヤー名"),
    player_weapons: new class extends ColumnGetter {
        getData(coopHistory) {
            let players = [coopHistory["myResult"]];
            if (options.includeCoopPlayer) {
                for (let i = 0; i < 3; i++) {
                    players.push(coopHistory["memberResults"][i]);
                }
            }
            let fields = [];
            players.forEach(player => {
                for (let i = 0; i < 4; i++) {
                    fields.push(this.dotWalk(player["weapons"][i], "name"));
                }
            })
            return fields;
        }
        getHeader() {
            if (options.includeCoopPlayer) {
                return ["ブキW1(自分)", "ブキW2(自分)", "ブキW3(自分)", "ブキEX(自分)",
                    "ブキW1(2P)", "ブキW2(2P)", "ブキW3(2P)", "ブキEX(2P)",
                    "ブキW1(3P)", "ブキW2(3P)", "ブキW3(3P)", "ブキEX(3P)",
                    "ブキW1(4P)", "ブキW2(4P)", "ブキW3(4P)", "ブキEX(4P)"];
            } else {
                return ["ブキW1(自分)", "ブキW2(自分)", "ブキW3(自分)", "ブキEX(自分)"];
            }
        }
    }(),
    // オオモノシャケ
    enemy_defeat: new ColumnGetterEnemy("teamDefeatCount", "撃破数"),
    enemy_selfDefeat: new ColumnGetterEnemy("defeatCount", "自撃破数"),
    enemy_appear: new ColumnGetterEnemy("popCount", "出現数"),
}

function GetRowFromCoopHistory(isHeader, options, columnDatas, coopHistory) {
    let fields = [];

    // バイトリザルト
    columnDatas.forEach(column => {
        let columnGetter = column_templates[column];
        if (columnGetter !== undefined) {
            if (isHeader) {
                fields = [...fields, ...columnGetter.getHeader()];
            } else {
                fields = [...fields, ...columnGetter.getData(coopHistory)];
            }
        }
    });
    return fields.map(field => `"${String(field).replace('"', '""')}"`).join(',');
}

function Convert() {
    const resultsKey = "results";
    const coopHistoryKey = "coopHistory";

    const convertForm = document.converter;

    /** @type {HTMLInputElement} */
    const fileInputElement = convertForm.input_file;

    let inputData;
    let inputFile = fileInputElement.files[0];

    let columnDatas = GetColumns("dataSelector");
    options = GetOptions();

    const zipReader = new FileReader();
    zipReader.onload = () => {
        let resultFileDecompressed;

        // ZIPファイルを展開
        try {
            let zipArr = new Uint8Array(zipReader.result);
            let unzip = new Zlib.Unzip(zipArr);
            let fileList = unzip.getFilenames();
            if (!fileList.includes(resultPath)) {
                ShowError("ZIPファイルにリザルトファイルが含まれていません。\nsalmdroidNWのリザルトバックアップファイルではない可能性があります。");
                return;
            }
            resultFileDecompressed = unzip.decompress(resultPath);
        } catch (e) {
            ShowError("ZIPファイルの展開に失敗しました。\nZIPファイルが壊れている可能性があります。");
            return;
        }

        // JSONをパースする
        try {
            let textDecoder = new TextDecoder();
            inputData = JSON.parse(textDecoder.decode(resultFileDecompressed));
        } catch (e) {
            ShowError("JSONファイルの読み込みに失敗しました。\nファイルが壊れている可能性があります。");
            return;
        }
        inputData[resultsKey] = JSON.parse(inputData[resultsKey]);
        inputData[resultsKey].forEach(element => element[coopHistoryKey] = JSON.parse(element[coopHistoryKey]));

        // CSV出力
        let str = GetRowFromCoopHistory(true, options, columnDatas, null) + '\r\n';
        inputData[resultsKey].forEach(element => {
            let coopHistory = element["coopHistory"];
            let row = GetRowFromCoopHistory(false, options, columnDatas, coopHistory);
            str += row + '\r\n';
        });

        // Blobを作成
        let blob = new Blob([str], { type: "text/plain" });

        // 古いBlobのURLを破棄し、古いBlobのメモリを解放
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        outputUrl = URL.createObjectURL(blob);

        // ダウンロードリンクを作成
        let link = document.createElement('a');
        link.href = outputUrl;
        link.download = `${inputFile.name}.csv`;
        link.click();
    }
    zipReader.readAsArrayBuffer(inputFile);
}

function GetColumns(dataSelectorName) {
    const dataSelectors = document.getElementsByClassName(dataSelectorName);
    let columnDatas = [];
    let dataSelectorsAry = [...dataSelectors];
    dataSelectorsAry.forEach(element => {
        if (element.checked) {
            columnDatas.push(element.name);
        }
    });
    return columnDatas;
}

function GetOptions() {
    const optionCheckboxes = document.getElementsByClassName("optionCheckbox");
    let options = {};
    let optionCheckboxesAry = [...optionCheckboxes];
    optionCheckboxesAry.forEach(element => {
        options[element.name] = element.checked;
    });
    return options;
}

function ShowError(message) {
    alert(message);
}