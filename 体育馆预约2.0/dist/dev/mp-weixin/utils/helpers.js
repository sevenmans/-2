"use strict";
const common_vendor = require("../common/vendor.js");
function formatDate(date, format = "YYYY-MM-DD") {
  if (!date)
    return "--";
  try {
    let dateString = date;
    if (typeof date === "string") {
      dateString = date.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, "$1T$2");
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, "$1T$2");
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime()))
      return "--";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    const second = String(d.getSeconds()).padStart(2, "0");
    const dayOfWeek = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
    return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hour).replace("mm", minute).replace("ss", second).replace("dddd", dayOfWeek);
  } catch (error) {
    common_vendor.index.__f__("error", "at utils/helpers.js:35", "日期格式化错误:", error);
    return "--";
  }
}
function formatDateTime(datetime, format = "YYYY-MM-DD HH:mm") {
  if (!datetime)
    return "--";
  try {
    let dateString = datetime;
    if (typeof datetime === "string") {
      dateString = datetime.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, "$1T$2");
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, "$1T$2");
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime()))
      return "--";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    if (format === "YYYY-MM-DD HH:mm") {
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hour).replace("mm", minute).replace("ss", second);
  } catch (error) {
    common_vendor.index.__f__("error", "at utils/helpers.js:77", "时间格式化错误:", error);
    return "--";
  }
}
function safeDateParse(dateInput) {
  if (!dateInput)
    return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  try {
    let dateString = dateInput;
    if (typeof dateInput === "string") {
      dateString = dateInput.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, "$1T$2");
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, "$1T$2");
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    common_vendor.index.__f__("error", "at utils/helpers.js:144", "日期解析错误:", error, "输入:", dateInput);
    return null;
  }
}
function formatTime(dateInput, format = "YYYY-MM-DD HH:mm") {
  const date = safeDateParse(dateInput);
  if (!date)
    return "--";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const dayOfWeek = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
  return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hour).replace("mm", minute).replace("ss", second).replace("dddd", dayOfWeek);
}
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.formatTime = formatTime;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/helpers.js.map
