export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchProfile = async () => {
  const res = await fetch(`${API_URL}/profile`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

export const fetchExperience = async () => {
  const res = await fetch(`${API_URL}/experience`);
  if (!res.ok) throw new Error('Failed to fetch experience');
  return res.json();
};

export const fetchProjects = async (featured = false) => {
  const res = await fetch(`${API_URL}/projects${featured ? '?featured=true' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
};

export const fetchSkills = async () => {
  const res = await fetch(`${API_URL}/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
};

export const fetchGithubStats = async () => {
  const res = await fetch(`${API_URL}/github-stats`);
  if (!res.ok) throw new Error('Failed to fetch github stats');
  return res.json();
};

export const submitContact = async (data: { name: string; email: string; message: string }) => {
  const res = await fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to submit contact');
  return res.json();
};

export const fetchAchievements = async () => {
  const res = await fetch(`${API_URL}/achievements`);
  if (!res.ok) throw new Error('Failed to fetch achievements');
  return res.json();
};
