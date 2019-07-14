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
    return store
}

var fun2=()=>{
    store.b.user.title='test'
    return null
}

var jsTransaction=new Transaction([fun1,fun2],{store})


// jsTransaction._data=store

// Object.defineProperty(jsTransaction._data,'store',{
//     set(val){
//         console.log(666)
//         console.log(val)
//     },
//     get(){
        
//     }
// })

// store.c='dptt'

// for(var i in jsTransaction._data)
//  [i][i]=33

// jsTransaction._data.c=9999
// jsTransaction._data.b.rr='123'

jsTransaction.start()
jsTransaction.rollBack()

setTimeout(()=>{
    console.log(store)
    console.log(jsTransaction._data)
},3000)


