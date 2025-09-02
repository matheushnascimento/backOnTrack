export default function getDate() {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.getMonth().toString().padStart(2, "0");
  const displayDate = `${day}/${month}/${date.getFullYear()}`;
  return { ISOdate: date.toISOString(), displayDate };
}
