export async function load({ fetch }) {
  try {
    const res = await fetch('/data/modellab.json');
    if (!res.ok) return { modelData: null };
    return { modelData: await res.json() };
  } catch {
    return { modelData: null };
  }
}
