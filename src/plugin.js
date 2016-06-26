import {inject} from "fluxtuate"
import RetainDelegator from "fluxtuate/lib/delegator/retain-delegator"
import {store} from "fluxtuate/lib/context/_internals"
import {debugMediator} from "./_internals"
import {autobind} from "core-decorators"

@autobind
export default class ToolsPlugin {
    @inject
    eventDispatcher;
    
    @inject
    contextDispatcher;

    @inject
    context;

    mediators = [];
    
    initialize() {
        this.medsDelegator = new RetainDelegator();
        
        this.appStartedListener = this.contextDispatcher.addListener("started", ()=> {
            this.mediatorListner = this.contextDispatcher.addListener("mediator_created", (eventName, payload)=> {
                let med = payload.mediator;
                if(med[debugMediator]){
                    med.store = this.context[store];
                    med.context = this.context;
                    this.mediators.push(med);
                }

                this.medsDelegator.attachDelegate(med);
            });

            this.mediatorDestroyListener = this.contextDispatcher.addListener("mediator_destroyed", (eventName, payload)=> {
                let index = this.mediators.indexOf(payload.mediator);

                if (index !== -1) {
                    this.mediators.splice(index, 1);
                }

                this.medsDelegator.detachDelegate(payload.mediator);
            });
        });
    }
    
    destroy() {
        if(this.context[routerContextSymbol]) return;
        this.mediators = [];
        if(this.mediatorListner) {
            this.mediatorListner.remove();
            this.mediatorListner = null;
        }
        if(this.mediatorDestroyListener) {
            this.mediatorDestroyListener.remove();
            this.mediatorDestroyListener = null;
        }
        if(this.routeListener) {
            this.routeListener.remove();
            this.routeListener = null;
        }
        if(this.routeListener1) {
            this.routeListener1.remove();
            this.routeListener1 = null;
        }
        if(this.appStartedListener) {
            this.appStartedListener.remove();
            this.appStartedListener = null;
        }
        if(this.appStartingListener) {
            this.appStartingListener.remove();
            this.appStartingListener = null;
        }
    }
}