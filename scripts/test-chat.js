
const main = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/norms/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: 'Jaký je postup na vlašák?' })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data.answer);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
