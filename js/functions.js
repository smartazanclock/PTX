function Vakit(name, time, nextTime, currentTime, timeFormat) {
    this.name = name;
    this.time12 = format12(time);
    this.time24 = time;
    this.displayTime = (timeFormat == 12) ? format12(time) : time;
    this.currentTime = currentTime;
    this.nextTime = nextTime;
    this.startAngle12 = timeToRadians(time, 12);
    this.endAngle12 = timeToRadians(nextTime, 12);
    this.nextVakitIn = diffBetweenTimes(currentTime, nextTime);
    this.isCurrentVakit = isTimeBetweenTheTwo(currentTime, time, nextTime)
}


const format12 = (t) => {
    let tt = t.split(':');
    let th = tt[0];
    let tm = tt[1];
    let ap = 'ᴬ';
    if (th >= 12)
        ap = 'ᴾ'
    th = th % 12;
    if (th == 0)
        th = 12;
    return th + ':' + tm + ap;
}
const hours12 = (h) => { return (h % 12) }
const timeToRadians = (t, m) => {

    let adj = Math.PI / 2; /* 0 bottom */
    if (m == 12)
        adj = -Math.PI / 2; /* 0 top */

    let tt = t.toString().split(':');
    let angle = ((tt[0] * 60 + tt[1] * 1) * 2 * Math.PI / (m * 60)) + adj;
    angle = (angle % (2 * Math.PI));
    return angle;
    /* 24 hours = 1140 mins =  2Pi*/
}
const secondsToRadians = (s) => {
    return (s * 2 * Math.PI / 60) + 3 * Math.PI / 2;
    /* 60 seconds =  2Pi */
}
const hoursToRadians = (m) => {
    return (m * 2 * Math.PI / 720) + 3 * Math.PI / 2;
    /* 720 mins =  2Pi */
}
const minutesToRadians = (m) => {
    return (m * 2 * Math.PI / 60) + 3 * Math.PI / 2;
}

const handOnTop = (a) => {
    let ang = a - 3 * Math.PI / 2;
    if (ang <= Math.PI / 4 || ang >= 7 * Math.PI / 4)
        return true;
    else
        return false;
}

const handOnBottom = (a) => {
    let ang = a - 3 * Math.PI / 2;
    if (ang >= 3 * Math.PI / 4 && ang <= 5 * Math.PI / 4)
        return true;
    else
        return false;
}

const fillInZeros = (n) => {
    if (n < 10) {
        n = '0' + n
    }
    return n;
}
const diffBetweenTimes = (startTime, endTime) => {
    let diffMinutes = diffMinutesBetweenTimes(startTime, endTime);
    let diffH = Math.floor(diffMinutes / 60);
    let diffM = diffMinutes % 60;
    let r = diffH + ':' + fillInZeros(diffM);
    return (r);
}
const diffMinutesBetweenTimes = (startTime, endTime) => {
    let st = getTotalMinutes(startTime);
    let et = getTotalMinutes(endTime);
    let diffMinutes = et - st;
    if (st > et) {
        diffMinutes = 1440 - (st - et);
    }
    return diffMinutes;
}
const isTimeBetweenTheTwo = (time, startTime, endTime) => {
    let t = getTotalMinutes(time);
    let s = getTotalMinutes(startTime);
    let e = getTotalMinutes(endTime);
    let r = false;
    if (e > s) {
        if (t >= s && t < e) {
            r = true;
        }
    }
    else {
        r = !isTimeBetweenTheTwo(time, endTime, startTime);
    }
    return r;
}

const getTotalMinutes = (t) => {
    let tt = t.split(':');
    return tt[0] * 60 + tt[1] * 1;
}

const getOffsetHoursFromTimeZone = (tz) => {
    let date = new Date();
    let utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    let tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    return (tzDate.getTime() - utcDate.getTime()) / 3600000;
}
const addDaysToDate = (date, number) => {
    const newDate = new Date(date);
    return new Date(newDate.setDate(newDate.getDate() + number));
}

const getTimeZoneName = (tz) => {
    var lf = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" });
    var sf = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" });
    return lf.format(new Date())
}

const addMinutesToTime = (t, m) => {
    let thisTime = new Date();
    let tt = t.split(':');
    thisTime.setHours(tt[0], tt[1], 0);
    thisTime.setMinutes(thisTime.getMinutes() + m * 1);
    return (thisTime.getHours() + ':' + fillInZeros(thisTime.getMinutes()));
};