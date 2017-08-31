let PlatformType = {
    "browser": { val: "browser", name: "Browser" },  
    "ios": { val: "ios", name : "iOS" },
    "android": { val: "android", name: "Android" },

    name:function(val){
        switch(val){
            case this.browser.val:
                return this.browser.name;
            case this.ios.val:
                return this.ios.name;
            case this.android.val:
                return this.android.name;       
        }

        return "unknown"
    }
}

let app = new Vue({
  el: '#app',

  // 初期化
  created: function () {

   let dummyNameList = ['太宰治','三島由紀夫','カフカ','田中角栄', '大塩平八郎', '土方巽', 'アルベルト・アインシュタイン', 'バラモス', 'メタルスライム'];
   this.userName =  dummyNameList[Math.floor(Math.random() * dummyNameList.length)];

    // firebaseの設定
    this.setupFirebase().then(()=>{
        // chatの設定
        this.setupChat()
        // メッセージを読み込む
        this.loadMessage()
    })
  },

  // これ大事
  data: {
    message: ""
    , userName: ""
    , chatId: ""
    , userId: Math.random().toString(36).slice(-8)
    , messageList: []
    , developerName: "nakadoriBooks"
    , developerSite: "https://twitter.com/nakadoribooks"
    , qrUrl: ""
    , showedQr: false
  },

  // 処理
  methods: {

    // firebaeの設定
    setupFirebase: function(){
        
        var config = {
            apiKey: "AIzaSyBWasVTMVGAc1c8IlrXIdKYuIN5i8yMk-I",
            authDomain: "nakadorichat.firebaseapp.com",
            databaseURL: "https://nakadorichat.firebaseio.com",
            projectId: "nakadorichat",
            storageBucket: "",
            messagingSenderId: "46816258733"
        };
        firebase.initializeApp(config);

        return new Promise((resolve, reject)=>{
            firebase.database().ref("/.info/serverTimeOffset").on('value', (offset) => {
                var offsetVal = offset.val() || 0;
                this.timestampOffset = offsetVal
                resolve()
            });
        })
    },

    timestamp: function(){
        return Date.now() + this.timestampOffset;
    },

    messageRef: function(){
        return firebase.database().ref('messages')
    },

    // チャット読み込み
    setupChat: function(){
        let ref = firebase.database().ref('chats')
        let hash = location.hash

        // chatId があったとき
        if(hash != null && hash.length > 0){
            let chatId = hash.slice( 1 ) ;
            this.chatRef = ref.child(chatId)
            console.log("read chat", chatId)
        }
        // なかったとき
        else{
            let createdAt = this.timestamp()

            // 新しいチャットを作って
            this.chatRef = ref.push()

            // 保存する
            this.chatRef.set({
                createdAt: createdAt
                , createdAtReverse: -createdAt
            })

            location.href = location.origin + location.pathname + "#" + this.chatRef.key
        }

        this.qrUrl = "http://chart.apis.google.com/chart?chs=150x150&cht=qr&chl=anywaychat://" + this.chatRef.key
    },

    // メッセージを送る
    send: function(event){
        if(this.message.length == 0){
            return;
        }

        // 新しいメッセージを作って
        let message = this.messageRef().push()
        let createdAt = firebase.database.ServerValue.TIMESTAMP

        // 保存する
        let chat = this.chatRef.key
        message.set({
            chat: chat
            , message:this.message
            , userName: this.userName
            , userId: this.userId
            , createdAt: createdAt
            , platform: PlatformType.browser.val
        })

        this.chatRef.child("messageList").child(message.key).set(1)

        // 入力エリアリセット
        this.message = ""
    }

    // メッセージを読み込む
    , loadMessage:function(){
        let chatKey = this.chatRef.key
        
        // 最初に全部取ってくる、
        let messageListRef = this.chatRef.child("messageList")

        // 1. messageIdのリスト(messageList)
        messageListRef.once('value').then((snapshot) => {
            // 2. message の実態を持ってくる
            var promiseList = []
            let messageRef = this.messageRef()

            snapshot.forEach(function(childSnapshot) {
                var messageKey = childSnapshot.key
                promiseList.push(messageRef.child(messageKey).once("value"))
            })
            
            return Promise.all(promiseList)
        }).then((results) => {
            // 3. 整形
            var messageList = []
            for(var i=0, max=results.length;i<max;i++){
                let row = results[i]
                var data = row.val()
                data.key = row.key
                messageList.push(data)
            }

            // 4. 日付でソート
            messageList.sort((a,b) => {
                if( a.createdAt < b.createdAt ) return -1;
                if( a.createdAt > b.createdAt ) return 1;
                return 0;
            });

            // 5. 表示に反映
            this.messageList = messageList

            // 6. 下までスクロール
            this.scrollToBottom()

            // 7. 追加の監視
            this.observeMessage()
        });
    },

    // メッセージの監視
    observeMessage: function(){
        let messageListRef = this.chatRef.child("messageList")
        messageListRef.on("child_added", (snapshot) => {
            let newMessageKey = snapshot.key

            // すでにあるやつは弾く
            for(var i=0,max=this.messageList.length;i<max;i++) {
                let message = this.messageList[i]
                if(message.key == newMessageKey){
                    return
                }
            }
            
            // 実態を取りに行く
           this.messageRef().child(newMessageKey).once("value").then((snapshot)=>{
    
                // 整形して表示に反映
                let data = snapshot.val()
                data.key = snapshot.key
                this.messageList.push(data)
                this.scrollToBottom()
            })
        })
    },

    // 下までスクロール
    scrollToBottom :function() {
        setTimeout(()=>{
            let height = Math.max(0, document.body.scrollHeight - document.body.clientHeight)
            anime({
                targets: "body",
                scrollTop: height,
                duration: 200,
                easing: "easeInQuad"
            });
        }, 100)
    },

    // おれのメッセージ？
    isMyMessage: function(message){
        return this.userId == message.userId
    },

    platformName: function(message){
        return PlatformType.name(message.platform)
    },

    displayTime: function(message) {
        let timestamp = message.createdAt

        var date = new Date(timestamp)
        let now = new Date(this.timestamp())
        var diff = now.getTime() - date.getTime()
        var d = new Date(diff);

        if (d.getUTCFullYear() - 1970) {
            return d.getUTCFullYear() - 1970 + '年前'
        } else if (d.getUTCMonth()) {
            return d.getUTCMonth() + 'ヶ月前'
        } else if (d.getUTCDate() - 1) {
            return d.getUTCDate() - 1 + '日前'
        } else if (d.getUTCHours()) {
            return d.getUTCHours() + '時間前'
        } else if (d.getUTCMinutes()) {
            return d.getUTCMinutes() + '分前'
        } else {
            return d.getUTCSeconds() + '秒前'
        }
    }
  }
})
