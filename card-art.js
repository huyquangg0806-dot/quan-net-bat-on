/* Tranh thẻ dùng cùng hình khối, màu và nhân vật SVG của quán. Chỉ vẽ, không đổi trạng thái. */
(() => {
  'use strict';
  const ink = '#6B4A2F', cream = '#FFF6E3', teal = '#1FA89A';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const path = (d, fill = 'none', stroke = ink, w = 2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const ellipse = (x, y, rx, ry, fill, stroke = ink, w = 2) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
  const circle = (x, y, r, fill, stroke = ink, w = 2) => ellipse(x, y, r, r, fill, stroke, w);
  const rect = (x, y, w, h, fill, r = 5, stroke = ink) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  const group = (x, y, scale, body) => `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
  const star = (x, y, r, fill = '#F2CB57') => path(`M${x},${y-r} L${x+r*.28},${y-r*.28} L${x+r},${y} L${x+r*.28},${y+r*.28} L${x},${y+r} L${x-r*.28},${y+r*.28} L${x-r},${y} L${x-r*.28},${y-r*.28} Z`, fill, ink, 1.2);
  const leaf = (x, y, color = '#7CC0AE', flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">${path('M0,0 Q-24,-26 -34,-4 Q-18,12 0,0 Z', color)}${path('M0,0 L-23,-7', 'none', ink, 1.2)}</g>`;
  const flower = (x, y, color = '#EFA6AB') => `<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(a => `<ellipse cy="-8" rx="5" ry="8" fill="${color}" transform="rotate(${a})"/>`).join('')}${circle(0,0,4,'#F2CB57','none')}</g>`;
  const eyes = (x = 120, y = 126, gap = 17) => circle(x-gap,y,4,'#3A2A22','none') + circle(x+gap,y,4,'#3A2A22','none') + circle(x-gap+1,y-1,1.2,cream,'none') + circle(x+gap+1,y-1,1.2,cream,'none') + ellipse(x-gap-5,y+10,7,3,'#F3B3A4','none') + ellipse(x+gap+5,y+10,7,3,'#F3B3A4','none') + path(`M${x-5},${y+13} Q${x},${y+18} ${x+5},${y+13}`, 'none', ink, 1.8);
  const sparks = (color = '#F2CB57') => [[42,64,7],[199,91,5],[176,42,8],[53,169,5]].map(([x,y,r]) => star(x,y,r,color)).join('');
  const water = () => path('M12,193 Q42,185 72,193 T132,193 T228,193 L240,240 H0 Z','#AED8D0','none') + path('M32,205 H73 M104,220 H150 M169,201 H215','none','#6AAFA6',2);
  function habitat(n, sky = '#E3F0E3') {
    return rect(-2,-2,244,244,sky,0,'none') + circle(190,43,22,'#FFF1C4','none') + path('M0,172 Q60,140 115,177 Q174,143 240,171 V240 H0 Z','#BCD5B4','none') + ellipse(121,213,81,12,'#829C75','none') + leaf(40,185) + leaf(211,195,'#89AD76',true) + (n % 3 === 0 ? flower(42,210)+flower(205,202) : path('M24,216 l4,-8 l5,9 M208,220 l4,-10 l5,8','none','#658B61',2));
  }
  function animal(kind, color, detail = '') {
    const ears = kind === 'rabbit' ? ellipse(91,67,13,40,color)+ellipse(149,67,13,40,color)+ellipse(91,67,6,26,'#EFA6AB','none')+ellipse(149,67,6,26,'#EFA6AB','none')
      : kind === 'bear' || kind === 'mouse' || kind === 'otter' ? circle(84,91,kind==='mouse'?22:16,color)+circle(156,91,kind==='mouse'?22:16,color)+circle(84,91,8,'#F3C7B6','none')+circle(156,91,8,'#F3C7B6','none')
      : path('M80,108 L83,68 L108,98 M132,98 L157,68 L160,109', color);
    const tail = kind === 'fox' ? path('M159,174 Q225,181 205,120 Q201,152 171,146 Z',color)+path('M195,135 Q204,151 202,164 L185,151 Z',cream)
      : kind === 'mouse' ? path('M157,193 Q204,224 204,180 Q203,164 184,170','none','#CF9FA4',5)
      : kind === 'otter' ? path('M158,179 Q207,185 202,217 Q169,219 149,198 Z',color)
      : path('M158,173 Q197,158 183,132 Q177,156 151,156 Z',color);
    return tail + ellipse(120,181,42,35,color)+ellipse(120,187,25,24,cream,'none')+ellipse(88,204,17,10,color)+ellipse(153,204,17,10,color)+ears+ellipse(120,127,46,37,color)+ellipse(120,142,25,17,cream,'none')+eyes()+circle(120,136,3,ink,'none')+detail;
  }
  function bird(color, wings = false, detail = '') {
    return (wings ? path('M89,151 Q20,121 35,72 Q62,98 99,111 M146,111 Q180,91 205,63 Q211,122 151,151',color) : path('M88,152 Q54,156 70,185 L106,161 M154,151 Q185,155 167,184 L140,162',color)) + path('M101,181 L93,217 L117,204 L125,219 L141,185',color) + ellipse(122,160,37,45,color)+ellipse(123,165,23,31,cream,'none')+path('M99,110 L99,82 L115,95 M132,95 L148,82 L148,110',color)+ellipse(122,123,37,31,color)+eyes(122,122,15)+path('M115,135 L123,145 L131,135 Z','#F2CB57')+path('M104,203 v12 m-7,0 h13 M140,203 v12 m-7,0 h13','none',ink,3)+detail;
  }
  function turtle(tree = false) {
    const body=ellipse(117,173,61,39,'#7CC0AE')+ellipse(115,155,50,42,'#86A36A')+[[-22,0],[0,-15],[24,0],[0,20]].map(([x,y])=>path(`M${115+x-12},${155+y} l7,-11 h13 l7,11 l-7,11 h-13 Z`,'#B4C790',ink,1.4)).join('')+ellipse(179,181,23,25,'#9ECB9E')+eyes(181,179,9)+ellipse(73,207,20,9,'#9ECB9E')+ellipse(151,209,20,9,'#9ECB9E');
    return body+(tree ? path('M111,132 V53 H126 V132 Z','#A86F45')+circle(113,57,34,'#7EAF80')+circle(84,72,24,'#9FC18A')+circle(142,75,27,'#9FC18A')+sparks() : leaf(105,109)+leaf(115,106,'#7CC0AE',true)+flower(133,119));
  }
  function deer(crystal = false) {
    return path('M91,88 L78,53 L86,35 M81,66 L60,58 M148,86 L165,50 L160,29 M164,61 L185,45','none',crystal?'#A08BD2':ink,6)+path('M93,96 L73,87 L79,108 M147,96 L167,86 L162,108','#D8BEE8')+ellipse(122,174,38,32,crystal?'#F5EAF1':'#C0A6D8')+path('M95,188 V218 H106 V190 M139,189 V218 H150 V187',crystal?'#F5EAF1':'#C0A6D8')+ellipse(122,119,31,36,crystal?'#F5EAF1':'#C0A6D8')+eyes(122,120,12)+path('M151,171 Q185,163 174,144','none','#A08BD2',7)+[93,116,139].map(x=>circle(x,174,3,cream,'none')).join('')+(crystal?star(85,49,12,'#ABDAD9')+star(165,44,12,'#ABDAD9')+sparks('#E9B9DA'):path('M120,38 A20,20 0 1 0 137,66 A17,17 0 0 1 120,38 Z','#FFF1C4','none'));
  }
  function dragon(color, cosmic = false) {
    return path(cosmic?'M149,158 C221,213 40,239 54,164 C64,112 196,188 176,109':'M158,160 C216,204 107,226 65,201 C31,181 53,143 90,170 C119,194 188,160 164,124','none',ink,35)+path(cosmic?'M149,158 C221,213 40,239 54,164 C64,112 196,188 176,109':'M158,160 C216,204 107,226 65,201 C31,181 53,143 90,170 C119,194 188,160 164,124','none',color,31)+path('M108,87 L95,49 L107,63 L112,40 M149,86 L171,54 L159,59 L162,38','none','#D9AA56',5)+path('M93,98 L72,80 L82,125 M155,98 L176,81 L166,124','#F1DCB5')+ellipse(126,113,40,31,color)+ellipse(130,133,29,18,'#F1DCB5')+eyes(128,113,15)+path('M98,139 Q69,149 64,130 M154,139 Q183,150 185,128','none','#F1DCB5',4)+path('M70,165 l-12,-15 M130,202 l-7,-19 M184,183 l-4,-17','none','#F1DCB5',3)+(cosmic?sparks('#C5AFEA'):sparks());
  }
  function mystic(n) {
    let sky = n>=38?'#E6DEF1':n>=26?'#EAE3F3':'#E3F0E3';
    let scene=habitat(n,sky), body='';
    switch(n) {
      case 1: body=ellipse(120,176,53,33,'#C8905E')+rect(106,173,28,41,'#E9DCC4')+ellipse(120,171,59,15,'#F3CF98')+circle(120,123,43,'#B4CC80')+leaf(120,86)+leaf(121,84,'#7CC0AE',true)+eyes()+circle(91,100,4,'#FFFDF4','none'); break;
      case 2: body=rect(92,117,55,91,'#F3DFB1',22)+ellipse(120,108,67,22,'#EAB267')+path('M53,107 Q58,42 120,51 Q184,45 188,108 Z','#EAB267')+[[87,82],[122,69],[151,92]].map(([x,y])=>circle(x,y,9,'#FFF1C4','none')).join('')+eyes(120,158)+sparks(); break;
      case 3: body=turtle();scene+=water();break;
      case 4: body=animal('rabbit','#FFFDF4');scene=habitat(n,'#E3EEF2')+ellipse(60,174,58,20,cream,'none')+ellipse(185,197,63,18,cream,'none');break;
      case 5: body=bird('#9ABD8D',false,leaf(123,94)+leaf(144,176,'#7CC0AE',true));break;
      case 6: scene+=water();body=ellipse(118,128,63,43,'#B9DCE5')+path('M175,126 L211,93 L211,165 Z','#86BECD')+path('M94,87 Q119,47 143,87 M102,170 Q120,198 146,164','#86BECD')+eyes(96,127,12)+circle(52,91,6,'#E3F4F5')+circle(182,62,4,'#E3F4F5');break;
      case 7: body=ellipse(126,197,76,16,'#E3CDB0')+circle(111,145,48,'#F1DCE4')+path('M118,177 C65,163 68,104 114,112 C156,119 135,164 108,152 C88,142 113,127 123,140','none','#BFA1B5',4)+ellipse(170,180,24,25,'#E3CDB0')+path('M160,161 L153,141 M181,161 L187,140','none',ink,3)+circle(153,138,5,'#E3CDB0')+circle(187,137,5,'#E3CDB0')+eyes(170,179,9);break;
      case 8: scene+=water();body=ellipse(120,210,75,11,'#81B79A')+ellipse(120,176,44,34,'#A6CA8F')+ellipse(75,184,17,24,'#A6CA8F')+ellipse(165,184,17,24,'#A6CA8F')+circle(91,110,20,'#A6CA8F')+circle(148,110,20,'#A6CA8F')+ellipse(120,133,46,33,'#A6CA8F')+eyes(120,117,27)+[0,1,2,3,4].map(i=>flower(86+i*17,162,'#EFA6AB')).join('');break;
      case 9: body=path('M96,151 L33,114 L40,75 Q65,113 101,114 M142,115 Q176,115 201,74 L209,114 L147,153','#B68BAD')+animal('cat','#D3A0B6')+circle(86,182,12,'#A58BCC')+circle(107,185,10,'#A58BCC')+leaf(95,172);break;
      case 10: body=path('M65,174 L48,149 L66,145 L56,120 L76,119 L81,92 L101,111 L119,87 L132,110 L156,93 L163,124 L189,120 L181,146 L196,157 L168,194 Z','#A86F45')+ellipse(126,174,56,35,'#E3CDB0')+eyes(135,173)+circle(88,207,10,'#A86F45')+circle(154,212,10,'#A86F45');break;
      case 11: body=bird('#F4D99C',false,[83,111,143,169].map((x,i)=>path(`M${x},${178+i%2*8} q-9,11 0,22 q9,-11 0,-22`,'#F2CB57')).join(''));break;
      case 12: body=path('M149,177 Q208,184 201,218 Q178,207 143,202','#EAB267')+ellipse(116,173,42,32,'#EAB267')+ellipse(117,119,43,33,'#F0CA8A')+eyes(117,120)+path('M90,184 l-23,18 M144,184 l22,20','none',ink,7)+[95,121,146].map(x=>circle(x,165,4,'#FFF1C4','none')).join('');scene=habitat(n,'#F6E3C9');break;
      case 13: body=path('M74,166 L48,151 M80,186 L49,190 M164,165 L191,150 M160,185 L190,190','none',ink,4)+ellipse(120,163,46,49,'#67B8A6')+path('M120,115 V210','none',ink,3)+ellipse(98,159,17,34,'#BBDCE0')+ellipse(143,159,17,34,'#BBDCE0')+ellipse(120,113,27,23,'#67B8A6')+eyes(120,109,11)+path('M107,96 L99,76 M133,96 L141,76','none',ink,3);break;
      case 14: body=animal('cat','#D7E1DC')+path('M152,203 Q203,208 189,169 Q163,193 170,150','none','#F9F8EF',8);break;
      case 15: body=animal('mouse','#9EABC7')+star(120,176,17)+sparks();break;
      case 16: body=animal('fox','#E7B174')+path('M164,148 V183','none',ink,3)+rect(151,180,30,31,'#F2CB57',8)+path('M151,190 H181 M161,180 V211','none','#C98A10',2)+sparks();break;
      case 17: body=animal('cat','#BDD1E0')+path('M117,92 A13,13 0 1 0 131,107 A10,10 0 0 1 117,92 Z','#F2CB57','none')+sparks('#F1DCA4');break;
      case 18: scene+=water();body=animal('otter','#80B8AF')+path('M105,162 L135,155 L150,181 L124,203 L95,183 Z','#B9DCE5')+path('M105,162 L124,203 L135,155 M95,183 L150,181','none','#468DB8',2);break;
      case 19: body=bird('#EFA6AB',true,[flower(74,111),flower(167,105),flower(122,185)].join(''));break;
      case 20: body=path('M105,174 C34,138 48,214 126,210 C213,206 179,156 139,173','none',ink,31)+path('M105,174 C34,138 48,214 126,210 C213,206 179,156 139,173','none','#7CC0AE',27)+ellipse(133,131,37,35,'#7CC0AE')+eyes(133,130)+path('M107,111 L98,98 M153,109 L169,95','none','#F2CB57',4);break;
      case 21: body=animal('fox','#B8CBD9')+path('M99,93 L118,108 L139,91 M83,127 L100,139 M138,140 L155,126','none','#668BA9',5)+sparks('#D8E6EA');break;
      case 22: body=animal('bear','#DDB073')+rect(99,162,48,39,'#F2CB57',9)+[110,132].map(x=>path(`M${x-8},177 l4,-7 h8 l4,7 l-4,7 h-8 Z`,'#EAB267')).join('');break;
      case 23: body=ellipse(79,125,45,56,'#B9DCE5')+ellipse(164,124,45,56,'#D8BEE8')+ellipse(87,181,36,35,'#D8BEE8')+ellipse(154,181,36,35,'#B9DCE5')+path('M46,108 L108,148 L56,149 M183,86 L140,159 L192,135','none',cream,3)+ellipse(120,152,12,49,'#F1DCA4')+circle(120,103,17,'#F1DCA4')+eyes(120,102,7)+path('M113,88 L103,66 M127,88 L138,66','none',ink,3);break;
      case 24: body=deer()+path('M144,86 Q170,115 154,149 Q174,130 176,101 Z','#7BB9C6')+water();break;
      case 25: scene+=water();body=ellipse(120,166,50,34,'#EFA6AB')+path('M83,183 L61,209 M89,192 L82,220 M151,192 L159,220 M159,182 L183,208','none',ink,4)+path('M77,156 Q50,164 39,135 L27,107 L46,114 L49,95 L67,121 Q71,140 77,140 M163,156 Q191,164 202,134 L213,106 L193,114 L190,95 L174,122 Q167,139 163,140','#EFA6AB')+eyes(120,156,21)+path('M96,139 V121 M144,139 V121','none',ink,4)+circle(96,116,9,'#EFA6AB')+circle(144,116,9,'#EFA6AB');break;
      case 26: body=deer();break;
      case 27: body=bird('#EFA6AB',true)+[flower(62,103),flower(188,94),flower(123,183)].join('');break;
      case 28: body=animal('cat','#FFFDF4')+path('M96,91 l8,18 M142,90 l-7,20 M78,143 l20,3 M145,146 l19,-5 M96,172 l14,7 M144,183 l-9,9','none','#668BA9',5)+path('M47,70 L33,98 L50,96 L41,125 M195,62 L179,91 L197,87 L186,120','#F2CB57');break;
      case 29: body=ellipse(113,141,72,44,'#A6A0CF')+path('M174,133 Q202,101 211,116 L205,149 L218,169 Q186,185 168,151','#A6A0CF')+path('M71,159 Q110,193 153,161','#E3DEF1')+circle(70,131,5,ink,'none')+path('M95,180 L129,169 L118,198 Z','#A6A0CF')+rect(87,84,25,22,'#7CC0AE')+path('M78,85 L99,65 L119,85 Z','#EFA6AB')+sparks();break;
      case 30: body=path('M97,142 L70,99 L41,95 M93,157 L56,132 L35,143 M92,174 L49,182 L33,205 M98,189 L76,220 M144,142 L171,97 L200,95 M149,157 L185,131 L207,144 M149,174 L191,182 L207,205 M141,189 L162,221','none',ink,4)+ellipse(121,143,36,41,'#B4A4D0')+circle(121,186,26,'#D8BEE8')+eyes(121,133,15)+path('M25,39 L210,44 L190,91 L50,79 Z','none','#B4A4D0',1.5)+sparks('#D8BEE8');break;
      case 31: body=path('M149,177 Q215,175 205,219 Q165,209 137,203','#7B748A')+ellipse(117,177,42,34,'#7B748A')+ellipse(119,119,45,34,'#7B748A')+eyes(119,119)+path('M91,169 l16,13 l-7,13 M135,158 l-7,15 l19,14 M159,196 l22,7','none','#EAB267',4)+path('M78,195 l-13,10 M157,187 l16,19','none',ink,6)+sparks('#F07A5A');break;
      case 32: body=bird('#D7E1E8',true)+path('M42,83 l10,25 l9,-19 M175,91 l8,21 l9,-27','none','#86BECD',4)+sparks('#B9DCE5');break;
      case 33: body=dragon('#91C9BD');scene=habitat(n,'#E3EEF2');break;
      case 34: scene+=water();body=dragon('#86BECD')+path('M103,60 V34 M104,47 L89,39 M106,43 L117,31 M160,54 L174,24 M167,39 L186,34','none','#EFA6AB',5);break;
      case 35: body=bird('#EAB267',true)+sparks()+path('M104,197 L92,231 M125,199 L125,233 M141,197 L159,231','none','#F07A5A',5);break;
      case 36: body=turtle(true);break;
      case 37: body=[-80,-60,-40,-20,0,20,40,60,80].map((a,i)=>`<g transform="translate(120 184) rotate(${a})">${path('M0,0 Q-25,-42 0,-109 Q26,-41 0,0 Z',i%2?'#EAB267':'#F3DFB1')}${circle(0,-74,8,'#F2CB57')}</g>`).join('')+animal('fox','#FFFDF4');break;
      case 38: body=deer(true);break;
      case 39: body=dragon('#B4A4D0',true)+circle(115,174,17,'#E6DEF1')+star(115,174,13,'#F2CB57');break;
      case 40: scene=habitat(n,'#E3DEF1')+path('M120,0 H240 V240 H120 Z','#F6E3C9','none');body=bird('#F1DCA4',true)+path('M37,88 L68,116 M184,111 L205,84','none','#EFA6AB',8)+sparks('#EFA6AB');break;
    }
    return scene+body;
  }
  function room(n) {
    return rect(-2,-2,244,244,'#F4E3BE',0,'none')+rect(0,109,240,35,'#9CCDBC',0,'none')+path('M0,121 H240 M36,109 V144 M84,109 V144 M132,109 V144 M180,109 V144 M228,109 V144','none','#74B3A3',1)+rect(0,145,240,95,'#EFE3C8',0,'none')+path('M0,185 H240 M0,221 H240 M44,145 L23,240 M110,145 L105,240 M177,145 L189,240','none','#D9C4A0',1.2)+rect(16,61,59,42,'#484A50')+rect(22,67,47,29,n%2?'#7CC0AE':'#A9CFDC',2,'none')+rect(40,103,11,10,'#484A50',1)+rect(9,113,73,9,'#C8905E',2)+path('M17,122 V147 M74,122 V147','none','#94603A',5)+ellipse(120,217,70,9,'#D9C4A0','none');
  }
  const keys = () => rect(48,117,146,62,'#484A50',7)+Array.from({length:36},(_,i)=>rect(57+(i%9)*14,126+Math.floor(i/9)*12,10,8,i%7?'#D6D4CA':'#7CC0AE',1,'none')).join('');
  const bottle = (x,y,color) => rect(x,y,20,46,color,5)+rect(x+5,y-7,10,8,'#D6D4CA',2)+rect(x+1,y+15,18,15,cream,0,'none');
  function actor(kind) {
    const A=window.ART, L={...A.OWNER_LOOK,apron:false,towel:false,style:'tee',shirt:'#49B7A8',trim:'#137A70',accent:teal};
    let mood='smile', carry=null, extra='';
    if(kind==='gamer'){Object.assign(L,{shirt:'#2B2D35',trim:'#424655',headset:true});extra=group(47,205,.62,keys());}
    if(kind==='staff'){Object.assign(L,{hairStyle:'ponytail',shirt:'#F07A5A',apron:true});carry='cup';}
    if(kind==='credit'){Object.assign(L,{hairStyle:'bun',shirt:'#8E6BD8',glasses:true});extra=rect(175,175,37,30,'#F3DFB1')+path('M182,183 H205 M182,191 H200','none',ink,2);}
    if(kind==='cook'){Object.assign(L,{shirt:'#F7F3EA',apron:true,towel:true});carry='bowl';}
    if(kind==='night'){Object.assign(L,{style:'hoodie',shirt:'#668BA9',trim:'#4A5A78',headset:true,beard:true});mood='idle';}
    if(kind==='accountant'){Object.assign(L,{style:'cardigan',shirt:'#C9A27A',trim:'#94603A',inner:cream,hairStyle:'bob',glasses:true});extra=rect(161,182,36,38,cream)+path('M168,192 H187 M168,200 H187 M168,208 H187','none',ink,1.5);}
    if(kind==='repair'){Object.assign(L,{shirt:'#5A8FE0',hairStyle:'side'});extra=rect(168,157,35,59,'#484A50')+circle(185,178,10,'#7CC0AE')+path('M176,172 L194,184 M176,184 L194,172','none',ink,2);}
    if(kind==='mom'){Object.assign(L,{style:'blouse',shirt:'#8E6BD8',trim:'#6B4DAD',hairStyle:'bun',helmet:'#E2463A',pattern:'dots'});mood='angry';}
    if(kind==='leader'){Object.assign(L,{hairStyle:'ponytail',shirt:'#E86A92',headset:true});extra=group(49,216,.72,A.standingSVG({...L,shirt:'#5A8FE0',hairStyle:'cap',cap:'#1FA89A'},{mood:'smile'}))+group(193,216,.72,A.standingSVG({...L,shirt:'#F2CB57',hairStyle:'side'},{mood:'smile'}));}
    if(kind==='guard'){Object.assign(L,{hair:'#8A8F9A',hairStyle:'cap',cap:'#4A5A78',shirt:'#4A5A78',trim:'#30415C',beard:true});extra=path('M160,161 l32,-7 l6,14 l-32,7 Z','#D6D4CA')+path('M197,156 L226,145 L226,184 L200,168 Z','#FFF1C4','none');}
    if(kind==='veteran'){Object.assign(L,{shirt:'#A86F45',trim:'#6D4428',hairStyle:'side',headset:true,beard:true,glasses:true});mood='idle';extra=star(190,66,15);}
    if(kind==='owner'){Object.assign(L,A.OWNER_LOOK);carry='bowl';extra=rect(171,169,29,34,cream)+path('M178,177 H193 M178,185 H193','none',ink,1.5);}
    return extra+group(120,223,1.32,A.standingSVG(L,{mood,carry,owner:kind==='owner'}));
  }
  function cafe(n) {
    const A=window.ART; let scene=room(n), body='';
    switch(n){
      case 1: body=rect(80,76,80,78,'#5A8FE0',13)+[91,110,129].map(y=>rect(92,y,56,7,'#3D7FD6',3,'none')).join('')+path('M77,151 H166 L171,178 H72 Z','#5A8FE0')+path('M81,175 L71,218 M157,175 L168,218','none','#3D7FD6',9)+path('M77,193 l-5,15','none','#DDD8CC',9);break;
      case 2: body=path('M120,106 C66,98 61,170 83,193 C101,215 149,215 164,186 C183,147 164,107 120,106 Z','#484A50')+path('M120,109 V152 M78,153 H165','none','#A0A3A8',2)+rect(114,123,12,24,'#D6D4CA',4)+path('M120,106 C149,65 64,58 85,30','none','#484A50',4);break;
      case 3: body=keys()+path('M74,189 H175','none','#D6D4CA',2);break;
      case 4: body=path('M70,154 C54,57 187,57 170,154','none','#484A50',17)+rect(60,130,27,67,'#484A50',10)+rect(153,130,27,67,'#484A50',10)+rect(65,137,17,52,'#94603A',7)+rect(158,137,17,52,'#94603A',7)+path('M69,151 l8,8 l-8,9 M164,170 l7,-8','none','#D9C4A0',3);break;
      case 5: body=rect(48,101,153,104,'#668BA9',8)+path('M49,201 l-10,7 M63,205 l-8,8 M186,204 l9,9 M201,190 l10,4','none','#B9C0C4',2)+path('M60,113 H189 V192','none','#90A5C5',2);break;
      case 6: body=rect(105,162,28,43,'#7CC0AE')+ellipse(119,208,44,9,'#7CC0AE')+circle(119,118,54,'#A9CFC0')+[0,120,240].map(a=>`<g transform="translate(119 118) rotate(${a})">${path('M0,0 Q-7,-44 24,-36 Q41,-9 0,0 Z','#7CC0AE')}</g>`).join('')+circle(119,118,9,'#F3DFB1')+circle(119,118,48,'none')+path('M66,118 H172 M119,65 V171','none','#94603A',2);break;
      case 7: body=group(122,204,3.7,A.cupSVG());break;
      case 8: body=rect(48,128,153,53,'#FFFDF4',10)+[72,117,162].map(x=>circle(x,153,15,'#E9DCC4')+circle(x-5,153,3,ink,'none')+circle(x+5,153,3,ink,'none')).join('')+path('M201,151 Q236,109 209,93','none','#484A50',4);break;
      case 9: body=[72,136].map((x,i)=>`<g transform="rotate(${i?13:-13} ${x+20} 155)">${ellipse(x+21,159,25,49,'#EAB267')}${path(`M${x},142 Q${x+20},116 ${x+42},142 L${x+42},160 H${x} Z`,'#F3CF98')}${[0,1,2,3,4,5].map(k=>circle(x+9+k%3*11,139+Math.floor(k/3)*12,2.6,ink,'none')).join('')}</g>`).join('');break;
      case 10: body=path('M57,165 L139,141 L186,168 L100,199 Z','#A9CFDC')+path('M65,169 L105,184 L167,167','none','#6AA1B9',2)+rect(139,87,39,64,'#B9DCE5',8)+rect(148,74,22,15,'#7CC0AE')+path('M138,77 H184 L183,89 H153 Z','#FFFDF4');break;
      case 11: body=[0,1,2].map(i=>path(`M${62+i*13},160 C13,96 192,65 194,138 C212,196 44,221 60,145 C56,107 175,106 169,152`,'none',['#5A8FE0','#7CC0AE','#8E6BD8'][i],5)).join('')+rect(58,152,20,30,'#D6D4CA')+rect(160,181,20,30,'#D6D4CA');break;
      case 12: body=rect(52,69,142,145,'#A86F45')+rect(63,80,120,123,'#354C43',2)+path('M78,102 H165 M78,127 H150 M78,152 H165 M78,179 H143','none',cream,3)+circle(155,178,6,'#F2CB57');break;
      case 13: body=rect(60,128,131,73,'#C8905E')+path('M60,128 L51,99 L185,81 L191,128 Z','#D9C4A0')+[0,1,2].map(i=>rect(75+i*19,142+i*4,48,31,['#A9CFDC','#C9C790','#EFA6AB'][i],2)).join('')+circle(160,181,9,'#EAB267')+circle(143,187,9,'#EAB267');break;
      case 14: body=path('M120,188 L152,52','none','#A86F45',8)+path('M105,164 L129,170 L155,224 H58 Z','#D9AA56')+path('M104,179 L82,221 M115,182 L105,223 M124,184 L130,223','none','#A86F45',2);break;
      case 15: body=rect(59,79,130,130,'#A86F45')+rect(69,89,110,108,'#354C43',3)+path('M86,119 Q124,81 162,119 M97,133 Q124,106 151,133 M110,147 Q124,133 138,147','none','#7CC0AE',7)+circle(124,163,6,'#7CC0AE','none');break;
      case 16: body=group(121,181,3.6,A.bowlSVG())+path('M89,93 Q73,81 87,67 M123,86 Q108,69 124,53 M157,93 Q143,80 157,68','none','#FFFDF4',5);break;
      case 17: body=rect(66,105,112,99,'#484A50',11)+rect(83,123,79,46,'#7CC0AE')+path('M109,135 H136 M123,123 V150','none',cream,4)+circle(156,185,4,'#4FA35A','none');break;
      case 18: body=rect(56,140,139,60,'#484A50',8)+[79,124,171].map(x=>path(`M${x},142 V72`,'none','#484A50',7)).join('')+[76,95,114].map(x=>circle(x,176,3,'#7CC0AE','none')).join('');break;
      case 19: body=rect(49,129,149,87,'#F07A5A')+[0,1,2,3,4].map(i=>bottle(58+i*27,98+(i%2)*11,['#EFA6AB','#7CC0AE','#EAB267','#86BECD','#EFA6AB'][i])).join('')+rect(53,165,141,14,'#C75A42',1,'none');break;
      case 20: body=rect(83,59,80,105,'#484A50',18)+rect(96,70,54,80,'#668BA9',13)+rect(81,154,88,27,'#668BA9',9)+path('M67,141 H81 M168,141 H184 M123,182 V212 M123,210 L87,220 M123,210 L159,220','none','#484A50',8)+rect(111,153,29,22,'#D9C4A0',2)+path('M115,153 l4,22 M130,153 l4,22','none',ink,1.2);break;
      case 21: body=rect(63,127,125,76,'#484A50',10)+path('M80,133 V72 H166 V133 Z',cream)+path('M93,86 H151 M93,99 H148 M93,112 H151','none','#A9B6B0',2)+rect(80,170,91,13,'#3A2A22',3)+circle(173,154,4,'#7CC0AE');break;
      case 22: body=group(111,176,3.1,A.bowlSVG())+group(184,181,1.4,A.cupSVG())+ellipse(86,159,15,7,'#D77853')+ellipse(142,167,15,7,'#D77853');break;
      case 23: body=[0,1,2].map(i=>`<g transform="rotate(${-13+i*12} 120 159)">${rect(64+i*9,97+i*8,105,98,['#C8905E','#7CC0AE','#668BA9'][i],8)}${star(116+i*7,137+i*5,21,'#F2CB57')}</g>`).join('');break;
      case 24: body=rect(74,41,102,177,'#FFFDF4',9)+rect(83,54,84,152,'#BDD1E0',5)+path('M89,109 H161 M89,160 H161','none',cream,3)+[0,1,2,3,4,5].map(i=>bottle(92+i%3*22,77+Math.floor(i/3)*51,['#EFA6AB','#7CC0AE','#EAB267'][i%3])).join('')+rect(151,106,7,34,'#484A50',3);break;
      case 25: body=rect(80,73,96,24,'#D6D4CA',7)+path('M87,96 Q80,161 128,162 Q174,161 169,96 Z','#FFFDF4')+circle(128,128,23,'#484A50')+circle(128,128,13,'#668BA9')+circle(133,123,4,'#B9DCE5','none')+path('M124,63 V32','none','#484A50',7);break;
      case 26: body=actor('gamer');break;
      case 27: body=actor('staff');break;
      case 28: body=actor('credit');break;
      case 29: body=actor('cook');break;
      case 30: scene=rect(-2,-2,244,244,'#D6DBE7',0,'none')+scene;body=actor('night')+circle(203,44,18,'#FFF1C4','none');break;
      case 31: body=actor('accountant');break;
      case 32: body=actor('repair');break;
      case 33: body=actor('mom');break;
      case 34: body=actor('leader');break;
      case 35: body=actor('guard');break;
      case 36: body=actor('veteran');break;
      case 37: body=group(70,172,.23,A.stationSVG({m:{cpu:1,gpu:1,mon:1,chair:1,kb:1,mouse:1},i:0}))+group(180,172,.23,A.stationSVG({m:{cpu:1,gpu:1,mon:1,chair:1,kb:1,mouse:1},i:1}))+group(121,229,.54,A.stationSVG({m:{cpu:2,gpu:2,mon:2,chair:2,kb:2,mouse:2},i:2}));break;
      case 38: body=actor('owner')+sparks('#F2CB57');break;
      case 39: body=animal('cat','#FFFDF4',path('M80,99 Q100,77 110,105 M147,95 Q166,116 154,133','#EAB267','none')+path('M92,175 Q82,198 106,210','#484A50','none')+rect(98,153,45,8,'#F07A5A',3)+circle(120,167,7,'#F2CB57'))+star(191,74,9);break;
      case 40: scene=rect(-2,-2,244,244,'#D6DBE7',0,'none')+circle(204,36,15,'#FFF1C4','none')+rect(19,78,202,137,'#F4E3BE')+rect(33,112,173,103,'#9CCDBC')+rect(101,128,57,87,'#354C43')+rect(112,138,32,31,'#7CC0AE')+rect(39,132,48,44,'#EAB267')+rect(162,132,35,62,'#EAB267')+rect(28,61,185,43,'#137A70')+path('M18,104 H224 L211,124 H28 Z','#FFF6E3')+[0,1,2,3,4,5].map(i=>rect(23+i*34,104,17,20,teal,0,'none')).join('')+path('M16,218 H224','none','#C8905E',5);body=star(118,82,10);break;
    }
    return scene+body;
  }
  function svg(card) {
    card = CARD_CATALOG.find(c => c.id === card?.id);
    if (!card) return '';
    // Màu phẳng giúp tranh máy tính đứng độc lập, không phụ thuộc ID màu trong cảnh quán.
    const drawing = (card.set === 'huyen-bi' ? mystic(card.art) : cafe(card.art))
      .replace(/url\(#gRainbow\)/g, teal).replace(/url\(#pMesh\)/g, cream);
    return `<svg viewBox="0 0 240 240" role="img" aria-label="${esc(card.name)}" xmlns="http://www.w3.org/2000/svg">${drawing}</svg>`;
  }
  window.CardArt = { svg };
})();
