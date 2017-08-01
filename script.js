let app = new Vue({
  el: '#app',

  // 初期化
  created: function () {
    console.log("created")

    // ユーザ名の設定
    let inputedUserName = window.prompt("ユーザ名を入力してください", "");
    this.userName = inputedUserName
    
    if(inputedUserName.length == 0){
        // 入力がなかった場合
        let dummyNameList = ['太宰治','三島由紀夫','カフカ','田中角栄', '大塩平八郎', '土方巽', 'アルベルト・アインシュタイン', 'バラモス', 'メタルスライム'];
        this.userName =  dummyNameList[Math.floor(Math.random() * dummyNameList.length)];
    }

    // firebaseの設定
    this.setupFirebase()

    // chatの設定
    this.setupChat()

    // メッセージを読み込む
    this.loadMessage()
  },

  // これ大事
  data: {
    message: ""
    , userName: "nakadoriBooks"
    , userId: Math.random().toString(36).slice(-8)
    , messageList: []
    , chatUrl: ""
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
    },

    // チャット読み込み
    setupChat: function(){
        let ref = firebase.database().ref('chats')
        let params = location.search.match(/chatId=(.*?)(&|$)/)
        // chatId があったとき
        if(params != null){
            let chatId = params[1]
            this.chatRef = ref.child(chatId)
            console.log("read chat", chatId)
        }
        // なかったとき
        else{
            let createdAt = this.timestamp()
            this.chatRef = ref.push()
            this.chatRef.set({
                createdAt: createdAt
                , createdAtReverse: -createdAt
            })

            console.log("create chat", this.chatRef.key)
        }

        this.chatUrl = location.origin + location.pathname + "?chatId=" + this.chatRef.key
    },

    // メッセージを送る
    send: function(event){
        if(this.message.length == 0){
            return;
        }

        let messageRef = firebase.database().ref('messages').push()
      
        let createdAt = this.timestamp()
        let chat = this.chatRef.key
        messageRef.set({
            chat: chat
            , message:this.message
            , userName: this.userName
            , userId: this.userId
            , createdAt: createdAt
            , createdAtReverse: -createdAt
        })

      this.message = ""
    }

    // メッセージを読み込む
    , loadMessage:function(){
        let chatKey = this.chatRef.key
        let loadRef = firebase.database().ref("messages").orderByChild("chat").equalTo(chatKey)

        // 最初に全部取ってくる
        loadRef.once('value').then((snapshot) => {

            console.log("on value")

            var messageList = []            
            snapshot.forEach(function(childSnapshot) {
                var data = childSnapshot.val()
                data.key = childSnapshot.key
                messageList.push(data)
            })

            // 日付でソート
            messageList.sort(function(a,b){
                if( a.createdAt < b.createdAt ) return -1;
                if( a.createdAt > b.createdAt ) return 1;
                return 0;
            });

            // 表示に反映
            this.messageList = messageList

            // 追加の監視
            this.observeMessage()

            // 下までスクロール
            this.scrollToBottom()
        });
    },

    // メッセージの監視
    observeMessage: function(){
        let chatKey = this.chatRef.key
        let chatRef = firebase.database().ref("messages").orderByChild("chat").equalTo(chatKey)
        chatRef.on("child_added", (snapshot) => {
            let newMessage = snapshot.val()
            newMessage.key = snapshot.key
            for(var i=0,max=this.messageList.length;i<max;i++) {
                let message = this.messageList[i]
                if(message.key == newMessage.key){
                    return
                }
            }

            // 表示に反映
            this.messageList.push(newMessage)
            this.scrollToBottom()
        })
    },

    // 下までスクロール
    scrollToBottom :function() {
        setTimeout(()=>{
            let height = Math.max(0, document.body.scrollHeight - document.body.clientHeight)
            console.log("height", height)
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

    displayTime: function(message) {
        let timestamp = message.createdAt * 1000
        var date = new Date(timestamp)
        var diff = new Date().getTime() - date.getTime()
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
    },
    timestamp: function(){
        let date = new Date()
        let timestamp = date.getTime()
        return Math.floor( timestamp / 1000 )
    }
  }
})
