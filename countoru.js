(function() {
    "use strict";
    /*
    転記元のアプリID
    アプリIDを変更することで、転記元アプリを指定できます。
    var APPID = 〇〇;
    */
    var APPID = 21773;

    //レコード全件取得(転記元アプリID, 出力レコードのスキップ数, レコード取得上限数, 取得したレコード)
    function fetchRecords(appId, opt_offset, opt_limit, opt_records) {
        var offset = opt_offset || 0;
        var limit = opt_limit || 500;
        var allRecords = opt_records || [];
        var params = {app: appId, query: 'order by レコード番号 asc limit ' + limit + ' offset ' + offset};
        return kintone.api('/k/v1/records', 'GET', params).then(function(resp) {
            allRecords = allRecords.concat(resp.records);
            if (resp.records.length === limit) {
                return fetchRecords(appId, offset + limit, limit, allRecords);
            }
            return allRecords;
        });
    }

    // 指定したフィールドに集計データを入力
    function set_data(aggregateResult) {
        // 転記先のレコード取得
        var record = kintone.app.record.get();
        // フィールドに集計データをセット
        Object.keys(aggregateResult).forEach(function(occupation) {
            Object.keys(aggregateResult[occupation]).forEach(function(selection) {
                Object.keys(aggregateResult[occupation][selection]).forEach(function(status) {
                    record['record'][occupation + '_' + selection + '_' + status]['value'] =
                        aggregateResult[occupation][selection][status];
                });
            });
        });
        kintone.app.record.set(record);
    }
    //レコードの集計(全レコード)
    function aggregate(records) {
        // 集計結果の連想配列
        var aggregateResult = {
            'エンジニア職': {
                '書類選考': {'合格': 0, '不合格': 0, '辞退': 0},
                '1次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '2次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '3次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '最終面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '内々定': {'合格': 0, '不合格': 0, '辞退': 0}
            },
            'ビジネス職': {
                '書類選考': {'合格': 0, '不合格': 0, '辞退': 0},
                '1次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '2次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '3次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '最終面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '内々定': {'合格': 0, '不合格': 0, '辞退': 0}
            },
            'カスタマーサポート職': {
                '書類選考': {'合格': 0, '不合格': 0, '辞退': 0},
                '1次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '2次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '3次面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '最終面接': {'合格': 0, '不合格': 0, '辞退': 0},
                '内々定': {'合格': 0, '不合格': 0, '辞退': 0}
            }
        };
        // 選考フェーズのリスト
        var selectionList = ["書類選考", "1次面接", "2次面接", "2.5次面接", "3次面接", "3.5次面接", "最終面接", "内々定", "内定"];
        // 不合格ステータスのリスト
        var failureStatusList = ["不合格連絡", "不合格連絡のダブルチェック中", "不合格(完了)"];
        var PASS = "合格", FAILURE = "不合格", REFUSAL = "辞退";

        // 集計結果の加算処理(希望職種, 選考フェーズ, ステータス)
        function addAggregateResult(occupation, checkSelection, status) {
            if (status === PASS) {
                ++aggregateResult[occupation][checkSelection][status];
            } else if (failureStatusList.indexOf(status) > -1) {
                ++aggregateResult[occupation][checkSelection][FAILURE];
            } else if (status === REFUSAL) {
                ++aggregateResult[occupation][checkSelection][status];
            }
        }

        // ステータスの判定(希望職種, 選考フェーズ, ステータス, 判定対象の選考フェーズ, 対象とする選考フェーズの開始インデックス)
        function checkStatus(occupation, selection, status, checkSelection, startIndex) {
            // 判定するレコードの選考フェーズが、対象とする選考フェーズに含まれる場合：ステータスが合格として、加算処理を行う
            if (selectionList.slice(startIndex, 9).indexOf(selection) > -1) {
                addAggregateResult(occupation, checkSelection, PASS);
             // 判定するレコードの選考フェーズが、判定対象の選考フェーズと同じ場合：ステータスが不合格または辞退として、加算処理を行う
            } else if (selection === checkSelection) {
                addAggregateResult(occupation, checkSelection, status);
            }
        }

        // 集計条件ごとにデータ集計
        for (var i = 0, l = records.length; i < l; i++) {
            // 選考フェーズ
            var selection = records[i]["選考フェーズ"].value;
            // 希望職種
            var occupation = records[i]["希望職種"].value;
            // ステータス
            var status = records[i]["ステータス"].value;
            if (occupation === "デザイナー職") {
                occupation = "エンジニア職";
            }
            // 書類選考
            checkStatus(occupation, selection, status, selectionList[0], 1);
            // 一次面接
            checkStatus(occupation, selection, status, selectionList[1], 2);
            // 二次面接
            checkStatus(occupation, selection, status, selectionList[2], 4);
            // 三次面接
            checkStatus(occupation, selection, status, selectionList[4], 6);
            // 最終面接
            checkStatus(occupation, selection, status, selectionList[6], 7);
            // 内定者
            checkStatus(occupation, selection, status, selectionList[7], 8);
        }
        set_data(aggregateResult);
    }

    // 転記元のフィールド存在チェック：チェック対象＝希望職種、選考フェーズ、ステータス
    function checkFormID() {
        var body = {
            "app": APPID
        };
        // 転記元のフィールド情報取得
        return kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', body)
          .then(function(resp) {
            // success
            var respProperties = resp["properties"];
            // フィールドコード一覧の配列
            var formIdArray = [];
            // フィールドコード一覧の配列を生成
            Object.keys(respProperties).forEach(function(form) {
                formIdArray.push(respProperties[form]["code"]);
            });
            // チェック対象が存在しない場合
            return formIdArray.indexOf("希望職種") > -1 &&
                formIdArray.indexOf("選考フェーズ") > -1 && formIdArray.indexOf("ステータス") > -1;
        });
    }

    // レコード追加イベント
    kintone.events.on('app.record.create.show', function(event) {
        // ボタンを設置
        var aggregateButton = document.createElement('button');
        aggregateButton.id = 'aggregate_button';
        aggregateButton.className = 'kintoneplugin-aggregate-button-normal';
        aggregateButton.innerHTML = '集計';
        aggregateButton.onclick = function() {
            checkFormID().then(function(success) {
                if (success) {
                    // 転記元の全レコード取得
                    fetchRecords(APPID).then(function(records) {
                        //レコード集計(全レコード)
                        aggregate(records);
                    });
                } else {
                    alert("転記元のアプリに変更があった可能性があります。アプリ管理者に報告してください");
                }
            });
        };
        kintone.app.record.getSpaceElement('aggregate_button').appendChild(aggregateButton);
    });
})();
