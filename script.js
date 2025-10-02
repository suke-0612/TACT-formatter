console.log("Loading.....")
const NUM_OF_DAYS = 5;
const NUM_OF_PERIODS = 5;
document.documentElement.style.setProperty('--num-of-days', NUM_OF_DAYS);

const main = () => {
    topnav = document.getElementById("topnav");

    const timeTableArray = makeTimeTableArray();

    const firstTimeTableHTML = makeTimeTableHTML(timeTableArray[0]);
    firstTimeTableHTML.id = "firstTimeTable";
    const secondTimeTableHTML = makeTimeTableHTML(timeTableArray[1]);
    secondTimeTableHTML.id = "secondTimeTable";

    applyClass(firstTimeTableHTML);
    applyClass(secondTimeTableHTML);
    const topnavContainer = document.getElementById("topnav_container");
    topnavContainer.style.display = "block";
    topnavContainer.insertBefore(firstTimeTableHTML, topnav);
    topnavContainer.insertBefore(secondTimeTableHTML, topnav);

    chrome.storage.local.get(['isFirstTerm'], function (result) {
        if (result.isFirstTerm) {
            firstTimeTableHTML.style.display = "grid";
            secondTimeTableHTML.style.display = "none";
        } else {
            firstTimeTableHTML.style.display = "none";
            secondTimeTableHTML.style.display = "grid";
        }
    });

    topnav.id = "";
    return;
}

const makeTimeTableArray = () => {
    let timeTableArray = new Array(2).fill(null).map(() => new Array(NUM_OF_DAYS).fill(null).map(() => new Array(NUM_OF_PERIODS).fill(null)));
    // サイトのボタンからサイト名、リンクを取得
    const links = topnav.getElementsByClassName('link-container');
    const siteLinkButtons = topnav.getElementsByClassName('Mrphs-sitesNav__menuitem ');
    // timeTableに時間割データを入れていく
    // サイトボタン削除の関係で逆順で処理
    let isTimeOverlap = false;
    for (let i = links.length - 1; i >= 0; i--) {
        const siteName = links.item(i).title;
        const lectureData = makeLectureData(siteName);
        const tagBtnName = lectureData.title;
        // 表に入れるボタンの作成
        const linkElement = document.createElement('a');
        linkElement.href = links.item(i).href;
        const spanElement = document.createElement('span');
        spanElement.textContent = tagBtnName;
        linkElement.appendChild(spanElement);
        if (lectureData.time != null) {
            let isAlready = false;
            if (lectureData.term.first) {
                for (let j = 0; j < lectureData.time.length; j++) {
                    if (timeTableArray[0][lectureData.time[j][0]][lectureData.time[j][1]] != null) {
                        isTimeOverlap = true;
                        isAlready = true;
                        continue;
                    }
                    timeTableArray[0][lectureData.time[j][0]][lectureData.time[j][1]] = linkElement.cloneNode(true);
                }
            }
            if (lectureData.term.second) {
                // 2期の場合は2期のボタンを作成
                for (let j = 0; j < lectureData.time.length; j++) {
                    if (timeTableArray[1][lectureData.time[j][0]][lectureData.time[j][1]] != null) {
                        isTimeOverlap = true;
                        isAlready = true;
                        continue;
                    }
                    timeTableArray[1][lectureData.time[j][0]][lectureData.time[j][1]] = linkElement.cloneNode(true);
                }
            }
            if (isAlready) {
                continue;
            }
            siteLinkButtons.item(i).remove();
        }
    }
    if (isTimeOverlap) {
        // 講義が重複した場合に警告を出す
        overlapWarning = document.createElement('div');
        overlapWarning.textContent = "時間が重複している講義があります！";
        overlapWarning.style.width = "10em";
        overlapWarning.style.backgroundColor = "#a20000";
        overlapWarning.style.borderRadius = "2px";
        overlapWarning.style.color = "white";
        overlapWarning.style.fontWeight = "bold";
        overlapWarning.classList.add("fa");
        overlapWarning.classList.add("fa-warning");
        topnav.insertBefore(overlapWarning, topnav.firstChild);
    }
    return timeTableArray;
};

// サイト名から曜日・時限、授業名を取得
const makeLectureData = (siteName) => {
    const timeData = siteName.replace(/\（[\d０-９]{4}年度以降入学者\）/g, "").trim().match(/[\(（]\d\d\d\d年度(.+)[\/／](.+)[\)）]/);
    if (timeData === null) {
        return { term: null, time: null, title: siteName };
    }
    const termStr = timeData[1];
    let firstTerm = false;
    let secondTerm = false;
    if (termStr.length === 3) {
        switch (termStr[1]) {
            case "１":
            case "1":
                firstTerm = true;
                break;
            case "２":
            case "2":
                secondTerm = true;
                break;
        }
    } else {
        firstTerm = true;
        secondTerm = true;
    }
    if (timeData[2] === "その他") {
        return { term: { first: firstTerm, second: secondTerm }, time: null, title: siteName };
    }
    const title = siteName.replace(/[\(\（]\d\d\d\d年度.+[\/／].+$/, "");
    const time = timeData[2].split(",");
    
    // 「火3-4限」のような連続時限を展開
    let expandedTime = [];
    for (let timeSlot of time) {
        const match = timeSlot.match(/(.)(\d+)-(\d+)限/);
        if (match) {
            const youbi = match[1]; 
            const start = parseInt(match[2]);
            const end = parseInt(match[3]);

            for (let i = start; i <= end; i++) {
                expandedTime.push(`${youbi}${i}限`);
            }
        } else {
            expandedTime.push(timeSlot);
        }
    }
    
    // 曜日・時限の変換
    let timeProcessed = [];
    for (let i = 0; i < expandedTime.length; i++) {
        const severalTime = expandedTime[i];
        timeProcessed.push([]);
        switch (severalTime[0]) {
            case "月":
                timeProcessed[i].push(0);
                break;
            case "火":
                timeProcessed[i].push(1);
                break;
            case "水":
                timeProcessed[i].push(2);
                break;
            case "木":
                timeProcessed[i].push(3);
                break;
            case "金":
                timeProcessed[i].push(4);
                break;
            case "土":
                timeProcessed[i].push(5);
                break;
        }
        switch (severalTime[1]) {
            case "１":
            case "1":
                timeProcessed[i].push(0);
                break;
            case "２":
            case "2":
                timeProcessed[i].push(1);
                break;
            case "３":
            case "3":
                timeProcessed[i].push(2);
                break;
            case "４":
            case "4":
                timeProcessed[i].push(3);
                break;
            case "５":
            case "5":
                timeProcessed[i].push(4);
                break;
            case "６":
            case "6":
                timeProcessed[i].push(5);
                break;
            case "７":
            case "7":
                timeProcessed[i].push(6);
                break;
        }
    }
    return { term: { first: firstTerm, second: secondTerm }, time: timeProcessed, title: title };
};

const makeTimeTableHTML = (timeTableArray) => {
    const table = document.createElement('div');
    table.classList.add("timeTable");
    const periodButtonContainer = makePeriodButtons();
    table.appendChild(periodButtonContainer);
    const emptyDiv = document.createElement('div');
    emptyDiv.classList.add("emptyDiv");
    table.appendChild(emptyDiv);
    const div = document.createElement('div');
    table.appendChild(div);
    for (let i = 1; i < NUM_OF_DAYS + 1; i++) {
        const WEEK_LIST = ["月", "火", "水", "木", "金", "土"];
        const div = document.createElement('div');
        div.textContent = WEEK_LIST[i - 1];
        table.appendChild(div);
    }
    for (let i = 0; i < NUM_OF_PERIODS; i++) {
        const div = document.createElement('div');
        div.textContent = (i + 1) + "限";
        table.appendChild(div);
        for (let j = 0; j < NUM_OF_DAYS; j++) {
            const div = document.createElement('div');
            if (timeTableArray[j][i]) {
                div.appendChild(timeTableArray[j][i].cloneNode(true));
            }
            table.appendChild(div);
        }
    }
    return table;
};

const makePeriodButtons = () => {
    const earlyPeriodButton = document.createElement('div');
    earlyPeriodButton.classList.add("firstPeriodButton");
    earlyPeriodButton.textContent = "1期";
    earlyPeriodButton.addEventListener('click', () => {
        chrome.storage.local.set({ isFirstTerm: true });
        updateTableHTML();

    });
    const latePeriodButton = document.createElement('div');
    latePeriodButton.classList.add("secondPeriodButton");
    latePeriodButton.textContent = "2期";
    latePeriodButton.addEventListener('click', () => {
        chrome.storage.local.set({ isFirstTerm: false });
        updateTableHTML();


    });
    chrome.storage.local.get(['isFirstTerm'], function (result) {
        if (result.isFirstTerm) {
            earlyPeriodButton.classList.add("periodButtonSelected");
        } else {
            latePeriodButton.classList.add("periodButtonSelected");
        }
    });
    const periodButtonContainer = document.createElement('div');
    periodButtonContainer.classList.add("periodButtonContainer");
    periodButtonContainer.appendChild(earlyPeriodButton);
    periodButtonContainer.appendChild(latePeriodButton);

    return periodButtonContainer;
};

const applyClass = (timeTableHTML) => {
    timeTableHTML.classList.add("Mrphs-sitesNav__menu");
    const links = timeTableHTML.querySelectorAll('div');
    links.forEach(link => {
        link.classList.add("Mrphs-sitesNav__menuitem");
    });
    timeTableHTML.querySelectorAll('a').forEach(link => {
        link.classList.add("link-container");
    });
};

const updateTableHTML = () => {
    chrome.storage.local.get(['isFirstTerm'], function (result) {
        const isFirstTerm = result.isFirstTerm;
        firstTimeTable = document.getElementById("firstTimeTable");
        secondTimeTable = document.getElementById("secondTimeTable");
        if (isFirstTerm) {
            firstTimeTable.style.display = "grid";
            secondTimeTable.style.display = "none";
        } else {
            firstTimeTable.style.display = "none";
            secondTimeTable.style.display = "grid";
        }
    });
}

main();