import formatDate from "./format-date";

const formatCurrentDate = () => formatDate(Date.now().toString());

export default formatCurrentDate;
