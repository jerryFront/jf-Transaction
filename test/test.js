var Transaction=require('../transaction').Transaction

var store={
    a:455,
    b:{
        rr:'hahaha',
        kk:'gggg',
        user:{
            id:344,
            img:'www.baidu.com' 
        }
    },
    c:'doto'
}

// console.log(JSON.stringify(store))

var fun1=()=>{
    store.b.rr='6868'
    return null
}

var fun2=()=>{
    store.b.user.title='test'
    return null
}

var jsTransaction=new Transaction([fun1,fun2],{store},str=>eval(str),res=>res)

jsTransaction.start()


setTimeout(()=>{
    // jsTransaction.rollBack()  //分手动或自动触发事务回滚，自动即检测到不满足逻辑条件
    console.log(store)
},3000)


