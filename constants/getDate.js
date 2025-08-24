export default function getDate() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const displayDate = `${date.getDate()}/${month}/${date.getFullYear()}`;
  return { ISOdate: date.toISOString(), displayDate };
}
