'use strict';

/**
 * 人数や文脈など、文の周りや背景にある状況をまとめて表すクラス
 */
class LogicalStatementContext {
  /**
   * LogicalStatementContext のインスタンスを作る。
   * @param {number} personCount 登場人物の数
   * @param {number} speakerIndex 発言している人のインデックス
   * @param {boolean} isRoot 最も外側にある文章かどうか
   * @param {boolean} shouldUseGa 助詞で 'は' の代わりに 'が' を使うかどうか
   * @param {?*} [preconditionPredicate=null] 前提となる文の述語を表すもの
   * @param {number} [complexityFactor=1] 文のランダム生成時に用いる、文の複雑度を表す 0 より大きい数
   */
  constructor(personCount, speakerIndex, isRoot, shouldUseGa, preconditionPredicate = null, complexityFactor = 1) {
    this.personCount = personCount;
    this.speakerIndex = speakerIndex;
    this.isRoot = isRoot;
    this.shouldUseGa = shouldUseGa;
    this.preconditionPredicate = preconditionPredicate;
    this.complexityFactor = complexityFactor;
  }

  /**
   * 他の LogicalStatementContext オブジェクトをコピーする。
   * @param {LogicalStatementContext} other 
   * @returns {LogicalStatementContext} コピーされた新しい LogicalStatementContext インスタンス
   */
  static from(other) {
    return new LogicalStatementContext(
      other.personCount,
      other.speakerIndex,
      other.isRoot,
      other.shouldUseGa,
      other.preconditionPredicate,
      other.complexityFactor
    );
  }

  /**
   * 助詞に 'は' と 'が' のどちらを使うかを返す。
   * @returns 使う助詞
   */
  particle() {
    return this.shouldUseGa ? 'が' : 'は';
  }
}

/**
 * 論理的な文の基底クラス
 */
class LogicalStatement {
  /**
   * 文章を入れ子にするときの階層
   */
  static nestingLayer = 0;

  /**
   * @param {LogicalStatementContext} context
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * 人物のインデックスからその人物の名前を返す。
   * @param {number} personIndex 人物のインデックス
   * @returns {string} 渡されたインデックスの人物の名前
   */
  static personNameFromIndex(personIndex) {
    return String.fromCharCode(65 + personIndex) + 'さん';
  }

  /**
   * 正直者かどうかを表す真偽値から `"正直者"` または `"嘘つき"` を返す。
   * @param {boolean} isTruthTeller 正直者かどうか
   */
  static personTypeStringFromBool(isTruthTeller) {
    return isTruthTeller ? '正直者' : '嘘つき';
  }

  /**
   * 与えられたコンテキストの中でランダムなインスタンスを返す。
   * @param {LogicalStatementContext} context
   * @returns {LogicalStatement}
   */
  static random(context) {
    throw new TypeError(`random 関数は ${this.constructor.name} では実装されていません`);
  }

  /**
   * 文章の文字列を返す。
   * @returns {string}
   */
  sentence() {
    throw new TypeError(`sentence 関数は ${this.constructor.name} では実装されていません`);
  }

  /**
   * 文に含まれる単独の文それぞれについて、そこで述べられる対象となる人物の組み合わせを
   * 整数のビットによって表し、それらの整数を並べた配列を返す。
   * @returns {number[]}
   */
  subjectBitsArray() {
    throw new TypeError(`subjectBitsArray 関数は ${this.constructor.name} では実装されていません`);
  }

  /**
   * 文の述語を表すもの、または必要がない場合 null を返す。
   * @returns {?*}
   */
  predicate() {
    return null;
  }

  /**
   * 正直者・嘘つきの組み合わせから文が **正しいかどうか** を true または false で返す。
   * @param {number} peopleTypeBits
   * @returns {boolean}
   */
  isTrueOn(peopleTypeBits) {
    throw new TypeError(`isTrueOn 関数は ${this.constructor.name} では実装されていません`);
  }

  /**
   * 正直者・嘘つきの組み合わせから文が発言者の発言として **つじつまが合うかどうか** を true または false で返す。
   * @param {number} peopleTypeBits 
   * @returns 
   */
  isConsistentOn(peopleTypeBits) {
    const speakerBit = (peopleTypeBits >> this.context.speakerIndex) & 1;
    return this.isTrueOn(peopleTypeBits) === (speakerBit !== 0);
  }

  /**
   * この文が成り立つ正直者・嘘つきの組み合わせにおいて必ず与えられた文
   * (`anotherStatement`) も成り立つとき、true を返し、そうでないときに false を返す。
   * @param {LogicalStatement} anotherStatement
   * @returns 
   */
  implies(anotherStatement) {
    return new BasicLogicalOrStatement(
      this.context,
      new BasicLogicalNotStatement(this),
      anotherStatement
    ).isTautology();
  }

  /**
   * 文が正直者・嘘つきの組み合わせに関わらず正しければ true を返し、そうでない場合は false を返す。
   * @returns {boolean}
   */
  isTautology() {
    for (let peopleTypeBits = 0; peopleTypeBits < (1 << this.context.personCount); peopleTypeBits++) {
      if (!this.isTrueOn(peopleTypeBits)) {
        return false;
      }
    }
    return true;
  }
}

class LogicalStatementGenerator {
  static #childStatementClasses = [];

  /**
   * `randomStatement()` メソッドで生成する LogicalStatement の子クラスを追加する。
   * @param {...(typeof LogicalStatement)} childClasses 追加する LogicalStatement の 0 個以上の子クラス
   */
  static addStatementClasses(...childClasses) {
    this.#childStatementClasses = this.#childStatementClasses.concat(childClasses);
  }

  /**
   * ランダムな LogicalStatement
   * @param {LogicalStatementContext} context 生成する LogicalStatement のコンテキスト
   * @param {number} [maxLayer=Infinity] 生成する LogicalStatement の `nestingLayer` の最大値
   * @returns {LogicalStatement}
   * @throws `nestingLayer` が `maxLayer` 以下の LogicalStatement の子クラスが見つからなかった場合に例外を発生させる。
   */
  static randomStatement(context, maxLayer = Infinity) {
    // 条件に合う LogicalStatement の子クラスを抽出する
    const classChoices = [];
    this.#childStatementClasses.forEach(c => {
      if (c.nestingLayer <= maxLayer) {
        classChoices.push(c);
      }
    });

    if (classChoices.length === 0) {
      throw new Error(`nestingLayer が ${maxLayer} 以下の LogicalStatement の子クラスが見つかりませんでした`);
    }

    // context.complexityFactor とそれぞれの子クラスの nestingLayer に応じて、
    // それぞれのクラスの重みを決め、重みが大きいクラスほど選ばれる確率を高くする

    // 現在までの重みの和
    let weightSum = 0;
    // 重みの累積和の配列
    const partialWeightSums = [];
    for (const c of classChoices) {
      const weight = Math.pow(context.complexityFactor, c.nestingLayer);
      weightSum += weight;
      partialWeightSums.push(weightSum);
    }

    while (true) {
      // 乱数に従って LogicalStatement の子クラスを選ぶ
      const r = Math.random() * weightSum;
      let choiceIndex = classChoices.length - 1;
      for (let i = 0; i < classChoices.length; i++) {
        if (r < partialWeightSums[i]) {
          choiceIndex = i;
          break;
        }
      }
      const classChoice = classChoices[choiceIndex];

      // 文章をランダムに生成する
      const randomStatement = classChoice.random(context);
      // もし文章の中で2回以上同じ人物の組み合わせが出てきたら、選び直す
      if (hasDuplicate(randomStatement.subjectBitsArray())) {
        continue;
      }

      return randomStatement;
    }
  }
}

/**
 * 論理演算の「否定」を表すクラス
 */
class BasicLogicalNotStatement extends LogicalStatement {
  constructor(substatement) {
    super(substatement.context);
    this.substatement = substatement;
  }

  isTrueOn(peopleTypeBits) {
    return !this.substatement.isTrueOn(peopleTypeBits);
  }
}

/**
 * 論理和を表すクラス
 */
class BasicLogicalOrStatement extends LogicalStatement {
  /**
   * @param {LogicalStatementContext} context 文のコンテキスト
   * @param {LogicalStatement} substatement1 1 番目の文
   * @param {LogicalStatement} substatement2 2 番目の文
   */
  constructor(context, substatement1, substatement2) {
    super(context);
    this.substatement1 = substatement1;
    this.substatement2 = substatement2;
  }

  isTrueOn(peopleTypeBits) {
    return this.substatement1.isTrueOn(peopleTypeBits) || this.substatement2.isTrueOn(peopleTypeBits);
  }
}

/**
 * 論理積を表すクラス
 */
class BasicLogicalAndStatement extends LogicalStatement {
  /**
   * @param {LogicalStatementContext} context 文のコンテキスト
   * @param {LogicalStatement} substatement1 1 番目の文
   * @param {LogicalStatement} substatement2 2 番目の文
   */
  constructor(context, substatement1, substatement2) {
    super(context);
    this.substatement1 = substatement1;
    this.substatement2 = substatement2;
  }

  isTrueOn(peopleTypeBits) {
    return this.substatement1.isTrueOn(peopleTypeBits) && this.substatement2.isTrueOn(peopleTypeBits);
  }
}

/**
 * 一人の人物が正直者または嘘つきであることを示す文のクラス
 */
class TrueFalseStatement extends LogicalStatement {
  static nestingLayer = 0;

  /**
   * @param {LogicalStatementContext} context 文のコンテキスト
   * @param {number} subjectIndex 主語となる人物のインデックス
   * @param {boolean} isTruthTeller 正直者かどうか
   */
  constructor(context, subjectIndex, isTruthTeller) {
    super(context);
    this.subjectIndex = subjectIndex;
    this.isTruthTeller = isTruthTeller;
  }

  static random(context) {
    const subjectIndex = Math.floor(Math.random() * context.personCount);
    const isTruthTeller = (Math.random() < 0.5);
    const randomStatement = new TrueFalseStatement(
      context, subjectIndex, isTruthTeller
    );
    return randomStatement;
  }

  sentence() {
    let statementString = '';
    if (this.subjectIndex === this.context.speakerIndex) {
      statementString += '私';
    } else {
      statementString += LogicalStatement.personNameFromIndex(this.subjectIndex);
    }
    if (this.context.preconditionPredicate === this.isTruthTeller) {
      statementString += 'も';
    } else {
      statementString += this.context.particle();
    }
    statementString += LogicalStatement.personTypeStringFromBool(this.isTruthTeller);
    if (this.context.isRoot) {
      statementString += 'です。';
    }
    return statementString;
  }

  subjectBitsArray() {
    return [1 << this.subjectIndex];
  }

  predicate() {
    return this.isTruthTeller;
  }

  isTrueOn(peopleTypeBits) {
    const subjectBit = (peopleTypeBits >> this.subjectIndex) & 1;
    return (subjectBit !== 0) === this.isTruthTeller;
  }
}

/**
 * 2人以上の人物の中での嘘つきの人数について述べる文のクラス
 */
class TypeCountStatement extends LogicalStatement {
  static nestingLayer = 0;

  /**
   * @param {LogicalStatementContext} context 文のコンテキスト
   * @param {number} subjectBits 対象となる人物の組み合わせをビットで表した整数
   * @param {boolean} liarCountBits 嘘つきの人数の可能性をビットで表した整数
   */
  constructor(context, subjectBits, liarCountBits) {
    super(context);
    this.subjectBits = subjectBits;
    this.liarCountBits = liarCountBits;
  }

  static random(context) {
    // 人物の組み合わせを、2人以上になるまで選び続ける
    let subjectBits;
    do {
      subjectBits = Math.floor(Math.random() * (1 << context.personCount));
    } while (popcount(subjectBits) <= 1);

    const subjectCount = popcount(subjectBits);

    // 0 人から subjectCount 人までの可能性の組み合わせを選ぶ。
    // どの可能性も含まないもの (0) や
    // 全ての可能性を含むもの ((1 << (subjectCount + 1)) - 1) は選ばない
    const liarCountBits =
      Math.floor(Math.random() * ((1 << (subjectCount + 1)) - 2)) + 1;

    const randomStatement = new TypeCountStatement(
      context, subjectBits, liarCountBits
    );
    return randomStatement;
  }

  sentence() {
    let statementString = '';
    const personCount = this.context.personCount;
    const speakerIndex = this.context.speakerIndex;
    const subjectCount = popcount(this.subjectBits);
    if (this.subjectBits === (1 << personCount) - 1) {
      statementString += `この${personCount}人`;
    } else {
      if (this.subjectBits & (1 << speakerIndex)) {
        statementString += '私と';
      }
      const subjectIndicesExceptSpeaker = [...Array(personCount).keys()].filter(
        i => i !== speakerIndex && ((this.subjectBits & (1 << i)) !== 0)
      );
      statementString += subjectIndicesExceptSpeaker.map(
        i => LogicalStatement.personNameFromIndex(i)
      ).join(
        subjectCount === 2 ? 'と' : '、'
      );
    }

    if (this.liarCountBits === 1 ||
        this.liarCountBits === (1 << subjectCount)) {
      if (subjectCount === personCount) {
        statementString += `${this.context.particle()}全員`;
      } else {
        statementString += `の${subjectCount}人とも`;
      }
      statementString += LogicalStatement.personTypeStringFromBool(this.liarCountBits === 1);
    } else {
      statementString += `のうち、嘘つきの人数${this.context.particle()}`;
      const liarCountBitsFlipped = ~this.liarCountBits & ((1 << (subjectCount + 1)) - 1);
      if (!(this.liarCountBits & (this.liarCountBits + 1))) {
        statementString += `${popcount(this.liarCountBits) - 1}人以下`;
      } else if (!(liarCountBitsFlipped & (liarCountBitsFlipped + 1))) {
        statementString += `${popcount(liarCountBitsFlipped)}人以上`;
      } else {
        statementString += [...Array(subjectCount + 1).keys()].filter(
          i => (this.liarCountBits & (1 << i)) !== 0
        ).map(
          i => `${i}人`
        ).join('か');
      }
    }

    if (this.context.isRoot) {
      statementString += 'です。';
    }
    return statementString;
  }

  subjectBitsArray() {
    return [this.subjectBits];
  }

  isTrueOn(peopleTypeBits) {
    const liarCount = popcount(this.subjectBits & ~peopleTypeBits);
    const liarCountBit = (this.liarCountBits >> liarCount) & 1;
    return liarCountBit !== 0;
  }
}

/**
 * 2つの文のどちらも正しいときに正しくなる文を表すクラス
 */
class LogicalAndStatement extends BasicLogicalAndStatement {
  static nestingLayer = 1;

  static random(context) {
    while (true) {
      const substatementContext1 = LogicalStatementContext.from(context);
      substatementContext1.isRoot = false;
      const substatement1 = LogicalStatementGenerator.randomStatement(substatementContext1, 0);

      const substatementContext2 = LogicalStatementContext.from(substatementContext1);
      substatementContext2.preconditionPredicate = substatement1.predicate();
      const substatement2 = LogicalStatementGenerator.randomStatement(substatementContext2, 0);

      const newStatement = new LogicalAndStatement(context, substatement1, substatement2);

      // 元々の2つの文のうちどちらかが必要ない場合や、新しい文がつねに偽になる場合、選び直す
      if (substatement1.implies(newStatement)
        || substatement2.implies(newStatement)
        || new BasicLogicalNotStatement(newStatement).isTautology()) {
        continue;
      }

      return newStatement;
    }
  }

  sentence() {
    let statementString = `${this.substatement1.sentence()}で、${this.substatement2.sentence()}`;

    if (this.context.isRoot) {
      statementString += 'です。';
    }
    return statementString;
  }

  subjectBitsArray() {
    return this.substatement1.subjectBitsArray().concat(this.substatement2.subjectBitsArray());
  }
}

/**
 * 2つの文のうち一方または両方が正しいときに正しくなる文を表すクラス
 */
class LogicalOrStatement extends BasicLogicalOrStatement {
  static nestingLayer = 1;

  static random(context) {
    while (true) {
      const substatementContext = LogicalStatementContext.from(context);
      substatementContext.isRoot = false;
      substatementContext.shouldUseGa = true;
      substatementContext.preconditionPredicate = null;
      const substatement1 = LogicalStatementGenerator.randomStatement(substatementContext, 0);
      const substatement2 = LogicalStatementGenerator.randomStatement(substatementContext, 0);

      const newStatement = new LogicalOrStatement(context, substatement1, substatement2);

      // 元々の2つの文のうちどちらかが必要ない場合や、新しい文がつねに真になる場合、選び直す
      if (newStatement.implies(substatement1)
        || newStatement.implies(substatement2)
        || newStatement.isTautology()) {
        continue;
      }

      return newStatement;
    }
  }

  sentence() {
    let statementString = `${this.substatement1.sentence()}か、または${this.substatement2.sentence()}`;

    if (this.context.isRoot) {
      statementString += 'です。';
    }
    return statementString;
  }

  subjectBitsArray() {
    return this.substatement1.subjectBitsArray().concat(this.substatement2.subjectBitsArray());
  }
}

/**
 * 「A ならば B」を表す文のクラス
 */
class LogicalIfStatement extends LogicalStatement {
  static nestingLayer = 2;

  /**
   * @param {LogicalStatementContext} context 文のコンテキスト
   * @param {LogicalStatement} antecedent 「ならば」の前の文
   * @param {LogicalStatement} consequent 「ならば」の後の文
   */
  constructor(context, antecedent, consequent) {
    super(context);
    this.antecedent = antecedent;
    this.consequent = consequent;
  }

  static random(context) {
    while (true) {
      const antecedentContext = LogicalStatementContext.from(context);
      antecedentContext.isRoot = false;
      antecedentContext.shouldUseGa = true;
      const antecedent = LogicalStatementGenerator.randomStatement(antecedentContext, 1);

      const consequentContext = LogicalStatementContext.from(antecedentContext);
      consequentContext.shouldUseGa = context.shouldUseGa;
      consequentContext.preconditionPredicate = antecedent.predicate();
      const consequent = LogicalStatementGenerator.randomStatement(consequentContext, 1);

      const newStatement = new LogicalIfStatement(context, antecedent, consequent);

      // 元々の2つの文のうちどちらかが必要ない場合や、新しい文がつねに真になる場合、選び直す
      if (newStatement.implies(new BasicLogicalNotStatement(antecedent))
        || newStatement.implies(consequent)
        || newStatement.isTautology()) {
        continue;
      }
      return newStatement;
    }
  }

  sentence() {
    let statementString = `もし、${this.antecedent.sentence()}ならば、${this.consequent.sentence()}`;

    if (this.context.isRoot) {
      statementString += 'です。';
    }
    return statementString;
  }

  subjectBitsArray() {
    return this.antecedent.subjectBitsArray().concat(this.consequent.subjectBitsArray());
  }

  isTrueOn(peopleTypeBits) {
    return !this.antecedent.isTrueOn(peopleTypeBits) || this.consequent.isTrueOn(peopleTypeBits);
  }
}

LogicalStatementGenerator.addStatementClasses(TrueFalseStatement, TypeCountStatement, LogicalAndStatement, LogicalOrStatement, LogicalIfStatement);