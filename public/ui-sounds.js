export function setupUISounds() {
  const source=globalThis.portfolioAsset?.('key-press.mp3') ?? '/assets/key-press.mp3';
  const voices=Array.from({length:4},()=>{
    const audio=new Audio(source);audio.preload='auto';audio.volume=.25;return audio;
  });
  let voice=0;
  const play=()=>{
    const audio=voices[voice++%voices.length];
    audio.currentTime=0;audio.play().catch(()=>{});
  };
  document.addEventListener('pointerdown',event=>{
    const control=event.target.closest('button,a,summary,[role="button"],input[type="button"],input[type="submit"],input[type="checkbox"],input[type="radio"],select');
    if(control&&!control.disabled&&event.button===0)play();
  },{capture:true});
  document.addEventListener('keydown',event=>{
    if(event.repeat||event.metaKey||event.ctrlKey||['Shift','Control','Alt','Meta','CapsLock'].includes(event.key))return;
    play();
  },{capture:true});
}

let springAudio;
export function playSpringSound() {
  try {
    springAudio ||= new (window.AudioContext || window.webkitAudioContext)();
    springAudio.resume().catch(()=>{});
    const now=springAudio.currentTime;
    const tone=springAudio.createOscillator();tone.type='triangle';
    tone.frequency.setValueAtTime(460,now);tone.frequency.exponentialRampToValueAtTime(105,now+1);
    const wobble=springAudio.createOscillator();wobble.frequency.setValueAtTime(18,now);wobble.frequency.exponentialRampToValueAtTime(7,now+1);
    const bend=springAudio.createGain();bend.gain.setValueAtTime(170,now);bend.gain.exponentialRampToValueAtTime(1,now+1);
    const gain=springAudio.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+1.1);
    wobble.connect(bend).connect(tone.frequency);tone.connect(gain).connect(springAudio.destination);
    tone.start();wobble.start();tone.stop(now+1.12);wobble.stop(now+1.12);
    tone.onended=()=>{tone.disconnect();wobble.disconnect();bend.disconnect();gain.disconnect();};
  } catch { /* Spring interaction remains available without audio. */ }
}
