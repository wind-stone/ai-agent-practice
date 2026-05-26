import {
    RunnablePassthrough,
    RunnableLambda,
    RunnableSequence,
    RunnableMap,
} from '@langchain/core/runnables';

// const chain = RunnableSequence.from([
//     RunnableLambda.from((input) => ({ concept: input })),
//     RunnableMap.from({
//         original: new RunnablePassthrough(),
//         processed: RunnableLambda.from((obj) => ({
//             concept: input,
//             upper: obj.concept.toUpperCase(),
//             length: obj.concept.length,
//         })),
//     }),
// ]);

// 输出：
// {
//     original: { concept: '神说要有光' },
//     processed: { concept: '神说要有光', upper: '神说要有光', length: 5 }
// }

// 另一种写法，LangChain 会把函数转为 RunnableLambda，把对象转为 RunnableMap
const chain = RunnableSequence.from([
    (input) => ({ concept: input }),
    // 如果是想保留原始属性，只是扩展一些属性，用 RunnablePassthrough.assign
    RunnablePassthrough.assign({
        original: new RunnablePassthrough(),
        processed: (obj) => ({
            concept: input,
            upper: obj.concept.toUpperCase(),
            length: obj.concept.length,
        }),
    }),
]);

// 输出：
// {
//     concept: '神说要有光',
//     original: { concept: '神说要有光' },
//     processed: { concept: '神说要有光', upper: '神说要有光', length: 5 }
// }

const input = '神说要有光';
const result = await chain.invoke(input);
console.log(result);
