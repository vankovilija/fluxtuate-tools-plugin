import {elementResponsible, model as modelKey} from "fluxtuate/lib/model/_internals"
import {event, command} from "fluxtuate/lib/command/_internals"
import {isEqual, isFunction} from "lodash/lang"
import {difference} from "lodash/array"

const watchData = Symbol("fluxtuate_watchData");

export default class Logger {
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