const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let parts = timeStr.split(' ');
        let hms = parts[0].split(':');
        let hour = parseInt(hms[0]);
        let minute = parseInt(hms[1]);
        let second = parseInt(hms[2]);
        let period = parts[1];

        if (period === 'am' && hour === 12) hour = 0;
        else if (period === 'pm' && hour !== 12) hour = hour + 12;

        return (hour * 3600) + (minute * 60) + second;
    }

    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);

    let diffSeconds = endSeconds - startSeconds;
    if (diffSeconds < 0) diffSeconds += 24 * 3600;

    let hours = Math.floor(diffSeconds / 3600);
    let remaining = diffSeconds % 3600;
    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    let minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;
    let secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;

    return hours + ':' + minutesStr + ':' + secondsStr;
}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function timeToSeconds(timeStr) {
        let parts = timeStr.split(' ');
        let hms = parts[0].split(':');
        let hour = parseInt(hms[0]);
        let minute = parseInt(hms[1]);
        let second = parseInt(hms[2]);
        let period = parts[1];

        if (period === 'am' && hour === 12) hour = 0;
        else if (period === 'pm' && hour !== 12) hour = hour + 12;

        return (hour * 3600) + (minute * 60) + second;
    }

    let startSeconds = timeToSeconds(startTime);
    let endSeconds = timeToSeconds(endTime);
    if (endSeconds <= startSeconds) endSeconds += 24 * 3600;

    let shiftSeconds = endSeconds - startSeconds;
    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;

    // Calculate active time as overlap between shift and delivery window
    let activeSeconds = 0;

    // Overlap with today's delivery window [8am, 10pm]
    let overlapStart = startSeconds;
    let overlapEnd = endSeconds;
    if (overlapStart < deliveryStart) overlapStart = deliveryStart;
    if (overlapEnd > deliveryEnd) overlapEnd = deliveryEnd;
    if (overlapEnd > overlapStart) activeSeconds += overlapEnd - overlapStart;

    // Overlap with next day's delivery window (handles overnight shifts)
    let overlapStart2 = startSeconds;
    let overlapEnd2 = endSeconds;
    if (overlapStart2 < deliveryStart + 86400) overlapStart2 = deliveryStart + 86400;
    if (overlapEnd2 > deliveryEnd + 86400) overlapEnd2 = deliveryEnd + 86400;
    if (overlapEnd2 > overlapStart2) activeSeconds += overlapEnd2 - overlapStart2;

    let idleSeconds = shiftSeconds - activeSeconds;

    let hours = Math.floor(idleSeconds / 3600);
    let remaining = idleSeconds % 3600;
    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    let minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;
    let secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;

    return hours + ':' + minutesStr + ':' + secondsStr;
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function timeToSeconds(timeStr) {
        let parts = timeStr.split(':');
        return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + parseInt(parts[2]);
    }

    let shiftSeconds = timeToSeconds(shiftDuration);
    let idleSeconds = timeToSeconds(idleTime);

    let activeSeconds = shiftSeconds - idleSeconds;
    if (activeSeconds < 0) activeSeconds = 0;

    let hours = Math.floor(activeSeconds / 3600);
    let remaining = activeSeconds % 3600;
    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    let minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;
    let secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;

    return hours + ':' + minutesStr + ':' + secondsStr;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
    function metQuota(date, activeTime) {
    let dateParts = date.split('-');
    let year = parseInt(dateParts[0]);
    let month = parseInt(dateParts[1]);
    let day = parseInt(dateParts[2]);

    let quotaSeconds;
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quotaSeconds = 6 * 3600;
    } else {
        quotaSeconds = (8 * 3600) + (24 * 60);
    }

    let timeParts = activeTime.split(':');
    let activeSeconds = (parseInt(timeParts[0]) * 3600) + (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);

    return activeSeconds >= quotaSeconds;
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
    function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    // Check for duplicate: same driverID and date
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);
    let hasBonus = false;

    let newLine = shiftObj.driverID + ',' + shiftObj.driverName + ',' + shiftObj.date + ',' +
        shiftObj.startTime + ',' + shiftObj.endTime + ',' + shiftDuration + ',' +
        idleTime + ',' + activeTime + ',' + quota + ',' + hasBonus;

    let trimmedContent = content.trimEnd();
    fs.writeFileSync(textFile, trimmedContent + '\n' + newLine + '\n');

    let record = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: hasBonus
    };

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
    function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue.toString();
            lines[i] = parts.join(',');
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join('\n'));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
    function countBonusPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    let found = false;
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === driverID) {
            found = true;
            let recordMonth = parseInt(parts[2].split('-')[1]);
            if (recordMonth === parseInt(month)) {
                if (parts[9] === 'true') {
                    count++;
                }
            }
        }
    }

    if (!found) return -1;
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
    function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === driverID) {
            let recordMonth = parseInt(parts[2].split('-')[1]);
            if (recordMonth === month) {
                let timeParts = parts[7].split(':');
                totalSeconds += (parseInt(timeParts[0]) * 3600) + (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);
            }
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    let remaining = totalSeconds % 3600;
    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    let hoursStr = '' + hours;
    let minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;
    let secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;

    return hoursStr + ':' + minutesStr + ':' + secondsStr;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
    function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let content = fs.readFileSync(textFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === driverID) {
            let dateParts = parts[2].split('-');
            let recordMonth = parseInt(dateParts[1]);
            if (recordMonth === month) {
                let year = parseInt(dateParts[0]);
                let day = parseInt(dateParts[2]);
                let quotaSeconds;
                if (year === 2025 && month === 4 && day >= 10 && day <= 30)
                    quotaSeconds = 6 * 3600;
                else
                    quotaSeconds = (8 * 3600) + (24 * 60);
                totalSeconds += quotaSeconds;
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;
    if (totalSeconds < 0) totalSeconds = 0;

    let hours = Math.floor(totalSeconds / 3600);
    let remaining = totalSeconds % 3600;
    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    let hoursStr = '' + hours;
    let minutesStr = minutes < 10 ? '0' + minutes : '' + minutes;
    let secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;

    return hoursStr + ':' + minutesStr + ':' + secondsStr;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
    function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let content = fs.readFileSync(rateFile, 'utf8').split('\r').join('');
    let lines = content.split('\n');

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === '') continue;
        let parts = line.split(',');
        if (parts[0] === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
            break;
        }
    }

    let actualParts = actualHours.split(':');
    let actualSeconds = (parseInt(actualParts[0]) * 3600) + (parseInt(actualParts[1]) * 60) + parseInt(actualParts[2]);

    let requiredParts = requiredHours.split(':');
    let requiredSeconds = (parseInt(requiredParts[0]) * 3600) + (parseInt(requiredParts[1]) * 60) + parseInt(requiredParts[2]);

    let missingSeconds = requiredSeconds - actualSeconds;
    if (missingSeconds < 0) missingSeconds = 0;

    let missingHours = Math.floor(missingSeconds / 3600);

    let allowance;
    if (tier === 1) allowance = 50;
    else if (tier === 2) allowance = 20;
    else if (tier === 3) allowance = 10;
    else allowance = 3;

    let deductibleHours = missingHours - allowance;
    if (deductibleHours < 0) deductibleHours = 0;

    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = deductibleHours * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;

    return Math.floor(netPay);
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
