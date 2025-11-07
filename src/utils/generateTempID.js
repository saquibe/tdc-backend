export const generateTemporaryId = (prefix = "TMP") => {
  const date = new Date();
  const year = date.getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}-${year}-${rand}`;
};
