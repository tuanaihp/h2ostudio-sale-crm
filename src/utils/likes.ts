export const parseLikes = (likesStr: any, id: string): number => {
  if (likesStr !== undefined && likesStr !== null && likesStr !== '') {
    const lower = String(likesStr).toLowerCase();
    if (lower.endsWith('k')) {
      return parseFloat(lower.replace('k', '')) * 1000;
    }
    return parseInt(lower.replace(/,/g, ''), 10) || 0;
  }
  const hash = (id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 1200 + (hash % 800);
};

export const formatLikes = (likes: number): string => {
  if (likes >= 1000) {
    return (likes / 1000).toFixed(1) + 'k';
  }
  return Math.floor(likes).toString();
};
