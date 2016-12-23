import {contextDispatcher} from "fluxtuate/lib/context/_internals"
import {elementResponsible, model as modelKey} from "fluxtuate/lib/model/_internals"
import {eventDispatchCallback} from "fluxtuate/lib/event-dispatcher/_internals"
import {event, command} from "fluxtuate/lib/command/_internals"
import {isEqual, isFunction} from "lodash/lang"
import {difference} from "lodash/array"

const watchData = Symbol("fluxtuate_watchData");

export default class Logger {
    static watchContext(context, watchChildren = true, watchModels = true) {
        let contextDispatcher = context[contextDispatcher];
        let dispatcher = context.dispatcher;

        let listeners = [];

        dispatcher[eventDispatchCallback] = (event)=>{
            console.log(`event ${event.eventName} was dispatched in context ${context.contextName}`);
        };

        listeners.push(contextDispatcher.addListener("executeCommand", (ev, command)=>{
            console.log(`command: ${command.constructor ? command.constructor.name : command.commandName} was executed in context ${context.contextName} ${command[event] ? `with event ${command[event]}` : ""}`);
        }));

        listeners.push(contextDispatcher.addListener("completeCommand", (ev, command)=>{
            console.log(`command: ${command.constructor ? command.constructor.name : command.commandName} was completed in context ${context.contextName} ${command[event] ? `with event ${command[event]}` : ""}`);
        }));

        listeners.push(contextDispatcher.addListener("mediator_created", (ev, payload)=>{
            console.log(`mediator: ${payload.mediator.constructor ? payload.mediator.constructor.name : payload.mediator.prototype ? payload.mediator.prototype.constructor.name : payload.mediator.name} was created in context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("mediator_initialized", (ev, payload)=>{
            console.log(`mediator: ${payload.mediator.constructor ? payload.mediator.constructor.name : payload.mediator.prototype ? payload.mediator.prototype.constructor.name : payload.mediator.name} was initialized in context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("mediator_destroyed", (ev, payload)=>{
            console.log(`mediator: ${payload.mediator.constructor ? payload.mediator.constructor.name : payload.mediator.prototype ? payload.mediator.prototype.constructor.name : payload.mediator.name} was destroyed from context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("mediator_updated", (ev, payload)=>{
            console.log(`mediator: ${payload.mediator.constructor ? payload.mediator.constructor.name : payload.mediator.prototype ? payload.mediator.prototype.constructor.name : payload.mediator.name} was updated in context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("mediator_mediated", (ev, payload)=>{
            console.log(`mediator: ${payload.mediator.constructor ? payload.mediator.constructor.name : payload.mediator.prototype ? payload.mediator.prototype.constructor.name : payload.mediator.name} executed ${payload.mediationKey} in context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("modelAdded", (ev, payload)=>{
            console.log(`model with key ${payload.modelKey} was added with class ${payload.model.modelClass.name} to context ${context.contextName}`);
            if(watchModels) {
                Logger.watchModel(payload.model.modelInstance);
            }
        }));

        listeners.push(contextDispatcher.addListener("modelRemoved", (ev, payload)=>{
            console.log(`model with key ${payload.modelKey} was added with class ${payload.model.modelClass.name} in context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("added_child", (ev, payload)=>{
            console.log(`added a new context with name ${payload.childContext.contextName} to context ${context.contextName}`);
            if(watchChildren) {
                Logger.watchContext(payload.childContext);
            }
        }));

        listeners.push(contextDispatcher.addListener("removed_child", (ev, payload)=>{
            console.log(`removed context ${payload.childContext.contextName} from context ${context.contextName}`);
        }));

        listeners.push(contextDispatcher.addListener("started", ()=>{
            console.log(`context ${context.contextName} started`);
        }));

        listeners.push(contextDispatcher.addListener("stopped", ()=>{
            console.log(`context ${context.contextName} stopped`);
        }));

        listeners.push(contextDispatcher.addListener("destroyed", ()=>{
            console.log(`context ${context.contextName} was destroyed`);
            listeners.forEach((listener)=>{
                listener.remove();
            });
        }));
    }
    static watchModel(modelToWatch) {
        let model = modelToWatch;
        if(model[modelKey]){
            model = model[modelKey];
        }
        model[watchData] = model.modelData;
        let modelName = model.constructor ? model.constructor.name : model.modelName;
        model.onUpdate((payload)=>{
            let responsibleElement = payload[elementResponsible];
            if(responsibleElement && isFunction(responsibleElement.update)){
                if(responsibleElement === model) {
                    console.log(`Model ${modelName} initiated to default values.`, payload.data);
                    return;
                }
                if(!responsibleElement[command]){
                    console.warn(`You should only update models from commands! ${modelName} was updated from a non-command statement!`);
                    return;
                }
                let c = responsibleElement[command];
                let commandName = c.constructor ? c.constructor.name : c.commandName;
                let eventName = c[event];
                let oldKeys = Object.keys(model[watchData]);
                let newKeys = Object.keys(payload.data);
                let changes = difference(newKeys, oldKeys) || [];
                changes = oldKeys.reduce((difference, key)=> {
                    return isEqual(model[watchData][key], payload.data[key]) ? difference : difference.concat(key);
                }, changes);

                console.log(`Model ${modelName} was altered by event ${eventName} in ${commandName}
                        changed properties: ${changes}`);
            }
        });
    }
}