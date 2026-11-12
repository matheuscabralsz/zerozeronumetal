# Online co-op — end-to-end test plan (manual)

Use the test address: **https://test.zerozeronumetal.pages.dev**. It has its own room server, so test rooms never mix with the real ones.
You need two devices. Below, **A** is a computer and **B** is a phone, but any two browsers work. For journey 8 you need a third browser **C** (a private window works).
Each step says what to do, then what you should see (→).

## 1. Create a room and join it
1. On A, open the game. → The title shows 1 JOGADOR, CRIAR SALA and ENTRAR NA SALA, and 1 JOGADOR is selected.
2. On A, choose CRIAR SALA. → A text box with a suggested room name (selected), and 3 suggested names under it.
3. Press ▼ in the box, then click one of the suggested names. → The name in the box changes each time. Now type "rock" (it replaces the selected text). Typing "m" does not mute the sound, and "p" does not go back.
4. Press ENTER. → "ROCK" in big letters and "ESPERANDO JOGADOR 2...".
5. On B, open the game and choose ENTRAR NA SALA. → A list with "ROCK". Nothing to type.
6. On B, pick ROCK with the stick and press SOCO. → Both devices go to the select screen at the same time.

## 2. Pick band members and start
1. On both devices, move to the **same** band member. On A, confirm first; then try to confirm on B. → B can NOT confirm it.
2. On B, pick a different band member and confirm. → Both devices go to the stage screen.
3. On B, press up and down. → Nothing changes. On A, choose stage 1 and confirm. → The story shows both band members, and the last line has both names.
4. On B, press a button. → The story moves on for both, and the stage starts on both devices.

## 3. Play a stage together
1. Walk with each player. → Each device moves only its own fighter. Each fighter has a J1 or J2 tag. The J1 panel is on the left and the J2 panel on the right, the same on both devices.
2. On A, walk far right while B stays still. → A stops at the screen edge and can NOT leave B behind off the screen.
3. Reach the first group of enemies. → About twice as many enemies as in a 1-player game, and they take more hits. The player who was behind is moved into the screen.
4. Let an enemy hit each player. → Both lose HP. Players never hurt each other, and they walk through each other.
5. Pick up coins with A only. → Only A's money goes up. Kill enemies. → Both get the same XP and stay at the same level.
6. Fill the PODER bar and use it on A. → Both devices show the cut-in, and nobody can move. During it, B's PODER button does nothing.
7. Play the boss fight. → One boss, much stronger than in a 1-player game. In the ROBÔ CHEFÃO fight, drones come 2 at a time.

## 4. Shop, pause and bonus room
1. On A, open a shop door. → A sees the shop. B sees the frozen game with "JOGADOR 1 ESTÁ NA LOJA", and B's buttons do nothing.
2. On A, buy something. → Only A's money goes down, and only A gets the item. Leave the shop. → The game goes on for both.
3. On B, press pause. → B sees the pause menu. A sees "JOGADOR 2 PAUSOU", and A's buttons do nothing. On B, choose VOLTAR AO JOGO. → The game goes on.
4. On B, switch to another app for 5 seconds. → The game pauses for both, with "JOGADOR 2 PAUSOU". Come back and close the pause menu. → The game goes on, and B's fighter is not walking by itself.
5. Use the bonus door with either player. → Both players go into the bonus room together. Afterwards the door does not open again in that stage.

## 5. Out of lives
1. Let B lose all lives. → B's panel shows FORA. B sees "VOCÊ ESTÁ FORA - ASSISTINDO". A keeps playing, and new enemies are normal 1-player strength.
2. Finish the stage. → The stage clear screen shows a card for each player. At the next stage, B is back with 3 lives.
3. In a new game, let both players lose all lives. → FIM DE JOGO appears only when the second player is out.

## 6. Lost connection
1. On B, turn on airplane mode for 5 seconds, then turn it off. → Both devices show "JOGADOR 2 RECONECTANDO...". When B is back, the game goes on with the same fighter, lives and money.
2. On B, turn on airplane mode for 20 seconds. → After 15 seconds, A sees "JOGADOR 2 SAIU" and keeps playing alone, with one HUD panel like a 1-player game.

## 7. Player 1 leaves
1. Start a new room game. In the middle of a stage, on A, open pause → SAIR DA SALA → SIM. → A goes to the title. B sees "JOGADOR 1 SAIU" and keeps playing **from the same moment**, with the same enemies, money and lives.

## 8. The room list
1. On C, choose ENTRAR NA SALA while no room is open. → "NENHUMA SALA ABERTA".
2. Keep C on the list. On A, create a room called "rock"; on B, create a room called "rock" too. → Within about 2 seconds, C shows "ROCK 2" first and "ROCK" under it, without pressing anything.
3. On A, press ESC. → Within about 2 seconds, ROCK leaves C's list.
4. On A, create a room again, and join it from B. → The room leaves C's list (it is full). Start the game. → It never comes back to the list, also after B leaves with SAIR DA SALA.
5. On B, switch to another app for 20 seconds while A waits in a new room. → The room stays in C's list.

## 9. The 1-player game is unchanged
1. Turn on airplane mode, open the game (it may be cached), and choose 1 JOGADOR. → The game works exactly like before, with the same HUD, camera and enemies. No room server is needed.
2. With no internet, choose CRIAR SALA. → "SEM CONEXÃO COM O SERVIDOR", then back to the title.
