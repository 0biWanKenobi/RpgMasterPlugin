import { DataConnection, Peer } from "peerjs";

export default class P2PService {

    private readonly peer: Peer | undefined;
    private peerId: string | undefined;

    private peerIdPromise = Promise.withResolvers<string>();
	
	private readonly P2P_PEER_PREFIX = "rpg_p2p_user"

    /**
     * Builds the peer and sets up the "open" event listener
     * to store the peer ID when the connection is established.
     */
	constructor(currentPeerId?: string) {
		this.peerId = currentPeerId || `${this.P2P_PEER_PREFIX}_${crypto.randomUUID()}`;
        this.peer = new Peer(this.peerId);
        this.peer.on("open", (id) => {
            this.peerId = id;
            this.peerIdPromise.resolve(id);
        });
    }


    public async getPeerIdAsync(): Promise<string> {
        return this.peerIdPromise.promise;
    }

    public connectToPeerAsync(peerId: string): Promise<MessageHandler> {

        if (!this.peer) {
            return Promise.reject(new Error("PeerJS is not initialized"));
        }
        
        const { promise, resolve, reject } = Promise.withResolvers<MessageHandler>();
        const connection = this.peer.connect(peerId);
        
        connection.on("open", () => {
            resolve(new MessageHandler(connection));
        });
        connection.on("error", (err) => {
            reject(err);
        });
        
        return promise;
    }
}

class MessageHandler {
	
	private connection: DataConnection;
	private characterReceivedCallback: (data: CharacterMessage) => any = (_)=> {};
	
	constructor(connection: DataConnection) {
		this.connection = connection;
		connection.on("data", (data) => {
			if(isCharacterMessage(data)) this.characterReceivedCallback(data);			
		})
	}
	
	public onCharacterReceived (callback :(c: CharacterMessage) => any){
		this.characterReceivedCallback = callback;	
	}
	
	public requestCharacter(){
		this.connection.send({
			id: this.connection.peer,
			name: 'Johnny Player',
			sentAt: new Date(),
			baseType: 'player',
			type: 'getCharacter',
		})
		return this;
	}
}


class CharacterMessage {
	public id: string;
	public name: string;
	public class: string;
	public level: number;
	public readonly type = "CharacterMessage";
}

function isCharacterMessage  (data: unknown):  data is CharacterMessage {
	if(typeof data == 'object' && data != null && "type" in data &&  typeof data["type"] == 'string'){
		return data.type === "CharacterMessage";	
	}
	return false;
	
}
