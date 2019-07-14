/**
 * 构想实现前端事务，主要解决流程快速可逆(方便回滚)
 * 将整个流程封装成一个事务，快速来重试等移除负影响
 * 事务需要满足相关特性，加锁/释放锁
 * 
 */


 /**
  * Transaction 对象定义属性
  * 
  * state:'',    //事务目前的状态 pending,locking,rollback,resolved,rejected
  * data:[] | Object,  //事务会涉及到更改的数据变量集合或者单独的复杂Object 
  * result:null,  当前事务执行结果
  * prevDatas:[],  复合类型数组，用来追踪数据来源，类似撤销记录下的历史数据
  * prevPoints:[], 记录数据来源的引用
  * events:[],   整个事务过程设计到的functions流程，compose顺序执行，每步捕捉异常返回或错误，如果错误，直接结束流程并进行错误回调
  * errorBack:Function, 捕捉事务失败的回调
  * notify：function , 事务结果通知
  * rollBack：Function, 事务回滚操作
  * start:Function, 开始执行事务
  * commit:Function, 提交事务
  * lock:Function, 增加事务锁
  * unlock:Function，释放事务锁
  * checkFunc:Function, 自定义判断事务执行过程已经失败的检测函数
  */

  class Transaction{
     
     constructor(funcs,data,checkFunc){
        if(!Array.isArray(funcs)){
            console.error('Transaction must be start with function Array')
            return
        }
        if(typeof data==='function'&&!checkFunc){
           checkFunc=data
           data=Object.create(null) 
        }
        //data因为要追溯历史，必须拷贝原始数据
        if(typeof data!=='object'){
           console.error(`Transaction's data should be either Object(has keys) or Object Array`)
           return
        }
        this.checkFunc=typeof checkFunc==='function'?()=>{
          let result=checkFunc();
          /**检测到不符合业务要求，即判定为事务执行失败，回滚操作 */
          if(typeof result==='boolean'&&!result){
             this.rollBack('逻辑不符，要求rollback')
          }
         }:undefined
        this.data=(typeof data==='object')?cloneData(data):[] 
        this.state='pending'
        this.events=funcs
        this.result=null
        this.prevDatas=[]
        this.prevPoints=[]
        
         
     }

     /**开始执行事务,判断是否锁定 */
     start(...arg){
       if(this.state!=='pending') return
       this.lock()
       //先拷贝原有数据，后续可考虑使用diff算法进行优化存储
       this.prevPoints.push(this.data)
       let _data=cloneData(this.data)
       this.prevDatas.push(_data)
       this.compose(arg)

     }

     /**增加事务锁 */
     lock(){
       this.state='locking'
     }

     /**释放事务锁，恢复初始状态 */
     unlock(){
        this.state='pending'
     }

     /**提交事务,更改prevDatas等状态 */
     commit(){
        
        //执行完后释放
        this.unlock()
     }

     /**回滚操作 */
     rollBack(err){
        console.log(err)
        if(this.state==='rollback') return
        this.state='rollback'
        console.error('Transaction is fail to End,Because '+(err?err.toString():'手动回滚')+',now rollBack')
        if(!this.prevDatas.length){
           console.error('Transaction rollBack error because nothing to rollBack')
        } 
        let _obj=this.prevDatas.pop(),obj1=this.prevPoints.pop()
        let func=obj=>{
           let str=''
           console.log(obj)
           console.log('****************')
           if(obj&&typeof obj==='object'){
            Object.keys(obj).forEach(key=>{
               try{
                let sf=JSON.stringify(obj[key])
                // str+=`${key}=JSON.stringify(${obj[key]});`
                // Object.keys(obj[key]).forEach(it=>{
                //    obj[key][it]=_obj[key][it]
                // })
                str+=`var ${key}=${sf};`
 
               }catch(e){
                  console.error(e.toString())
               }
            })
            console.log(str)
            eval(str) //利用eval将字符串变成js执行或采用new Function('return '+str)()函数执行
           } 
        }
        //回滚对应数据的污染，思路是遍历最近的prevData，立即执行函数将其key与value回滚到最初状态
         (function(){
             if(Array.isArray(_obj)){
                _obj.forEach(i=>func(_obj[i]))    
             }else{
                func(_obj)
             } 

         })()
        

        //执行完后释放
        this.unlock()      
     }

       /**
   * 支持funcs携带统一作用域this作为传递，默认this为左右边参数，且从左往右执行
   * 支持自定义终止执行的回调判断 
   * */
   compose(args){ 
      if(!Array.isArray(this.events)) return
      let len=this.events.length,_this=null //作用域
      if(len==1){
         Promise.resolve(this.events[0]).then(res=>this.checkFunc&&this.checkFunc.call(_this)).catch(err=>this.rollBack(err))
         return
      }   
      if(typeof this.events[len-1]==='object'){
         _this=this.events.pop()
      }

      let _init=this.events.shift(),i=1
      this.result=this.events.reduce((a,b)=>{
        if(a) a.then(res=>{
           if(this.checkFunc&&!(this.checkFunc.call(_this,res))){
              this.rollBack('不符合回调逻辑')
              return
           }   
           if(this.state!=='locking') return //表明此时已经释放锁，事务以回滚结束 
           if(++i===len) this.commit()   //表示已经遍历完了
           return b.apply(_this,res)
         }).catch(err=>this.rollBack(err))
      },Promise.resolve(_init.apply(_this,args)).catch(err=>this.rollBack(err)))
      
   }


  }


  /**
   * 针对Object和Array进行区分深拷贝处理
   * 不仅要存储value还要存储key,所以要求data必须为{}或{}型数组
   *  */
  function cloneData(data){
     if(data===null||typeof data==='undefined'||typeof data!=='object') return data
     const hasOwn=Object.prototype.hasOwnProperty
     let _obj=toString.call(data)==='[object Array]'?[]:{}
     for(let i in data){
        if(data.hasOwnProperty(i)){
           if(data[i]&&typeof data[i]==='object'){
            _obj[i]=arguments.callee.call(this,data[i])
           }else _obj[i]=data[i]
        }
     }
    
     return _obj
  }


  module.exports={
     Transaction,
     cloneData,
  }


 
