'use strict';

const personCountInput        = document.getElementById('person-count');
const sentenceComplexityInput = document.getElementById('sentence-complexity');
const generateButton          = document.getElementById('generate-button');
const quizArea                = document.getElementById('quiz-area');
const resultArea              = document.getElementById('result-area');
const resultHeadline          = document.getElementById('result-headline');
const resultParagraph         = document.getElementById('result-paragraph');
const confirmButtonArea       = document.getElementById('confirm-button-area');

/**
 * 登場人物の発言から、つじつまが合う正直者と嘘つきの組み合わせをすべて求め、
 * それらの組み合わせを表す整数の配列を返す。
 * @param {LogicalStatement[]} statements 登場人物の発言を表す LogicalStatement の配列
 * @returns {number[]}
 */
function solutionsTo(statements) {
  const personCount = statements.length;
  const solutions = [];
  for (let peopleTypeBits = 0; peopleTypeBits < (1 << personCount); peopleTypeBits++) {
    let isConsistent = true;
    for (let i = 0; i < personCount; i++) {
      if (!statements[i].isConsistentOn(peopleTypeBits)) {
        isConsistent = false;
        break;
      }
    }
    if (isConsistent) {
      solutions.push(peopleTypeBits);
    }
  }
  return solutions;
}

/**
 * 文章の複雑度を表す数値から、登場人物の発言を合計何文字にするかの目安を返す。
 * @param {number} personCount 人数
 * @param {number} t 文章の複雑度を表す数。0 以上 1 以下が目安
 * @returns {number}
 */
function interpolatedSentenceLength(personCount, t) {
  const sentenceLengthRangeStart = 11 * personCount;
  const sentenceLengthRangeEnd = 100 * (personCount - 1);
  const interpolationParameter = (Math.pow(2, 2 * t) - 1) / 3;
  return sentenceLengthRangeStart + interpolationParameter * (sentenceLengthRangeEnd - sentenceLengthRangeStart);
}

personCountInput.oninput = () => {
  if (!personCountInput.validity.valid) {
    const personCount = parseInt(personCountInput.value);
    const minPersonCount = parseInt(personCountInput.min);
    const maxPersonCount = parseInt(personCountInput.max);
    if (isNaN(personCount)) {
      personCountInput.value = '';
    } else if (personCount < minPersonCount) {
      personCountInput.value = minPersonCount;
    } else if (personCount > maxPersonCount) {
      personCountInput.value = maxPersonCount;
    } else {
      personCountInput.value = personCount;
    }
  }
};

generateButton.onclick = () => {
  if (personCountInput.value === '' || !personCountInput.checkValidity()) {
    return;
  }

  const personCount = parseInt(personCountInput.value);
  const sentenceComplexity = parseInt(sentenceComplexityInput.value);

  // 発言の合計文字数の最小値と最大値を決める
  let minSentenceLength = interpolatedSentenceLength(personCount, sentenceComplexity / 5);
  if (sentenceComplexity === 0) {
    minSentenceLength = 0;
  }
  let maxSentenceLength = interpolatedSentenceLength(personCount, (sentenceComplexity + 1) / 5);
  if (sentenceComplexity === 4) {
    maxSentenceLength = Infinity;
  }

  // 各人物に用いる LogicalStatementContext を作る。
  // 生成にかかる時間を短くするために、設定された複雑度に応じて complexityFactor を設定する
  const complexityFactor = Math.pow(10, (sentenceComplexity - 1) / 2 - 1);
  const statementContexts = [];
  for (let speakerIndex = 0; speakerIndex < personCount; speakerIndex++) {
    statementContexts.push(new LogicalStatementContext(
      personCount, speakerIndex, true, false, null, complexityFactor
    ));
  }

  // それぞれの人物の発言を生成してパズルを作り、解を求める
  const statements = [];
  const sentences = [];
  for (let speakerIndex = 0; speakerIndex < personCount; speakerIndex++) {
    const statement = LogicalStatementGenerator.randomStatement(statementContexts[speakerIndex]);
    statements.push(statement);
    sentences.push(statement.sentence());
  }
  let solutions = solutionsTo(statements);

  while (true) {
    // 解がちょうど 1 個で、文章が長さの条件を満たしていれば、そのパズルに決定する
    if (solutions.length === 1) {
      let sumOfSentenceLengths = 0;
      for (const sentence of sentences) {
        sumOfSentenceLengths += sentence.length;
      }
      if (minSentenceLength <= sumOfSentenceLengths && sumOfSentenceLengths <= maxSentenceLength) {
        break;
      }
    }

    // 人物を一人ランダムに選び、その人物の発言を生成し直して、再び解を求める
    const randomSpeakerIndex = Math.floor(Math.random() * personCount);
    statements[randomSpeakerIndex] = LogicalStatementGenerator.randomStatement(statementContexts[randomSpeakerIndex]);
    sentences[randomSpeakerIndex] = statements[randomSpeakerIndex].sentence();
    solutions = solutionsTo(statements);
  }

  // パズルの表示を作成する
  quizArea.innerText = '';
  const sentenceAreas = [];
  const answerSelectRadioInputs = [];
  for (let personIndex = 0; personIndex < personCount; personIndex++) {
    const rowDivision = document.createElement('div');
    rowDivision.className = 'row g-2 justify-content-end justify-content-md-start';
    quizArea.appendChild(rowDivision);

    const speechInfoDivision = document.createElement('div');
    speechInfoDivision.className = 'col-md col-xxl-8 d-flex flex-row';

    const speakerIconDivision = document.createElement('div');
    speakerIconDivision.className = 'speaker-icon';
    const speakerNameDivision = document.createElement('div');
    speakerNameDivision.className = 'speaker-name';
    speakerNameDivision.textContent = String.fromCharCode(65 + personIndex);
    speakerIconDivision.appendChild(speakerNameDivision);
    speechInfoDivision.appendChild(speakerIconDivision);

    const sentenceArea = document.createElement('div');
    sentenceArea.className = 'sentence-area';
    sentenceArea.textContent = sentences[personIndex];
    speechInfoDivision.appendChild(sentenceArea);
    sentenceAreas.push(sentenceArea);

    rowDivision.appendChild(speechInfoDivision);

    const answerSelectDivision = document.createElement('div');
    answerSelectDivision.className = 'col-auto';
    const answerSelectRadioGroup = document.createElement('div');
    answerSelectRadioGroup.className = 'btn-group mt-2';
    answerSelectRadioGroup.role = 'group';
    answerSelectRadioGroup.ariaLabel = `${LogicalStatement.personNameFromIndex(personIndex)}が正直者か嘘つきか`;
    answerSelectDivision.appendChild(answerSelectRadioGroup);
    rowDivision.appendChild(answerSelectDivision);

    const rowRadioInputs = [];
    const radioInfo = [
      ['nochoice', '未選択', 'secondary'],
      ['true',     '正直者', 'success'],
      ['false',    '嘘つき', 'danger']
    ];
    for (const [value, labelText, buttonBackground] of radioInfo) {
      const answerSelectRadioInput = document.createElement('input');
      answerSelectRadioInput.type = 'radio';
      answerSelectRadioInput.name = `radio-statement${personIndex}`;
      answerSelectRadioInput.id = `radio-statement${personIndex}-${value}`;
      answerSelectRadioInput.className = 'btn-check';
      answerSelectRadioInput.value = value;
      answerSelectRadioInput.autocomplete = 'off';
      if (value === 'nochoice') {
        answerSelectRadioInput.checked = true;
      }
      answerSelectRadioGroup.appendChild(answerSelectRadioInput);
      rowRadioInputs.push(answerSelectRadioInput);

      const answerSelectRadioInputLabel = document.createElement('label');
      answerSelectRadioInputLabel.className = `btn btn-outline-${buttonBackground}`;
      answerSelectRadioInputLabel.htmlFor = answerSelectRadioInput.id;
      answerSelectRadioInputLabel.textContent = labelText;
      answerSelectRadioGroup.appendChild(answerSelectRadioInputLabel);
    }
    answerSelectRadioInputs.push(rowRadioInputs);

    const horizontalRule = document.createElement('hr');
    quizArea.appendChild(horizontalRule);
  }

  confirmButtonArea.innerText = '';
  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'btn btn-primary w-100 mb-3';
  confirmButton.disabled = true;
  confirmButton.textContent = '解答する';
  confirmButtonArea.appendChild(confirmButton);

  resultArea.classList.add('d-none');

  // ラジオボタンの選択状態が変更されたときに解答ボタンの disabled 属性を設定し直す
  function onRadioChange() {
    for (let i = 0; i < personCount; i++) {
      // 「未選択」が選択されていたら解答ボタンの disabled 属性を true に設定する
      if (answerSelectRadioInputs[i][0].checked) {
        confirmButton.disabled = true;
        return;
      }
    }
    confirmButton.disabled = false;
  }

  for (let i = 0; i < personCount; i++) {
    for (const radioInput of answerSelectRadioInputs[i]) {
      radioInput.onchange = onRadioChange;
    }
  }

  confirmButton.onclick = () => {
    // ラジオボタンで入力された正直者と嘘つきの組み合わせを整数のビットで表す
    let peopleTypeBits = 0;
    for (let i = 0; i < personCount; i++) {
      const selectedValue = answerSelectRadioInputs[i].find(input => input.checked).value;
      if (selectedValue === 'nochoice') {
        return;
      }
      if (selectedValue === 'true') {
        peopleTypeBits |= 1 << i;
      }
    }

    if (peopleTypeBits === solutions[0]) {
      // resultArea に正解のメッセージを表示する
      resultArea.classList.remove('d-none', 'result-area-incorrect');
      resultArea.classList.add('result-area-correct');
      resultHeadline.textContent = '正解です！';
      resultParagraph.textContent = '「生成」ボタンを押すとパズルをもう一度生成できます。';

      // 解答ボタンを消す
      confirmButtonArea.innerText = '';

      // 選択されていないラジオボタンを無効化する
      for (let i = 0; i < personCount; i++) {
        for (const radioInput of answerSelectRadioInputs[i]) {
          if (!radioInput.checked) {
            radioInput.disabled = true;
          }
        }
      }

      // 発言内容エリアに正解用のスタイルを適用する
      for (let i = 0; i < personCount; i++) {
        sentenceAreas[i].classList.remove('sentence-contradicts');
        sentenceAreas[i].classList.add('sentence-correct');
      }
    } else {
      // resultArea に不正解のメッセージを表示する
      resultArea.classList.remove('d-none', 'result-area-correct');
      resultArea.classList.add('result-area-incorrect');
      resultHeadline.textContent = '残念…';
      resultParagraph.textContent = 'もう一度トライしてみよう！';

      // 矛盾している発言に .sentence-contradicts のスタイルを適用し、アニメーションさせる
      for (let i = 0; i < personCount; i++) {
        if (statements[i].isConsistentOn(peopleTypeBits)) {
          sentenceAreas[i].classList.remove('sentence-contradicts');
        } else {
          sentenceAreas[i].classList.add('sentence-contradicts');

          // 参考にしたページ：https://developer.mozilla.org/ja/docs/Web/CSS/CSS_animations/Tips
          sentenceAreas[i].classList.remove('sentence-contradicts-animation');
          requestAnimationFrame(t => {
            requestAnimationFrame(t => {
              sentenceAreas[i].classList.add('sentence-contradicts-animation');
            });
          });
        }
      }
    }
  };
};