import {Mediator} from "fluxtuate"
import {elementResponsible} from "fluxtuate/lib/model/_internals"
import {event, eventPayload} from "fluxtuate/lib/command/_internals"
import {debugMediator} from "./_internals"
import {findIndex} from "lodash/array"
import {isArray, isNumber, isString} from "lodash/lang"
import moment from "moment"

const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
const reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;

let dateParser = function (key, value) {
    if (typeof value === 'string') {
        var a = reISO.exec(value);
        if (a)
            return new Date(value);
        a = reMsAjax.exec(value);
        if (a) {
            var b = a[1].split(/[-+,.]/);
            return new Date(b[0] ? +b[0] : 0 - +b[1]);
        }
    }
    return value;
};

export default class DebugMediator extends Mediator {
    store;

    storeStates = [];
    commits = [];

    stateIndex = 0;
    commitIndex = 0;
    selectedDiskState;
    changingState = false;

    eventName;
    eventPayload;

    constructor() {
        super();
        this[debugMediator] = true;
    }

    init() {
        this.setProps({
            savedValues: this.getSavedValues()
        });
        this.linkModel(this.store, (payload)=>{
            if(!this.changingState) {
                let responsibleElement = payload[elementResponsible];



                if(this.stateIndex < this.storeStates.length) {
                    this.commit();
                    this.storeStates = this.storeStates.slice(0, this.stateIndex);
                }
                let source;
                if(isFunction(responsibleElement.execute)){
                    source = {changeReason: "Command", name: responsibleElement[event], data: responsibleElement[eventPayload]};
                }else if(isFunction(responsibleElement.setStore)){
                    source = {changeReason: "StoreInternal"};
                }else{
                    source = {changeReason: "ContextConfiguration", name: responsibleElement.contextName};
                }

                this.storeStates.push(Object.assign({date: new Date(), source}, payload, {models: undefined}));
                this.eventName = undefined;
                this.eventPayload = undefined;
                this.stateIndex = this.storeStates.length;
            }
            return {states: this.storeStates.slice(), commits: this.commits.slice(), selectedState: this.stateIndex, selectedCommit: this.commitIndex, selectedDiskState: this.selectedDiskState};
        });
    }

    goToState(index) {
        if(index < 1) return;
        if(index > this.storeStates.length) return;

        this.stateIndex = index;
        let i = this.stateIndex - 1;
        this.changingState = true;
        this.store.setData(this.storeStates[i].data);
        this.changingState = false;
    }

    commit(message) {
        if(!message || message.replace(/\s+/g, "") === "") {
            message = moment().format("DD.MM.YYYY HH:mm:ss");
        }

        this.commits.push({message, index: this.stateIndex, commitState: this.storeStates.slice()});

        this.commitIndex = this.commits.length;

        this.setProps({commits: this.commits.slice(), selectedCommit: this.commitIndex})
    }

    goToCommit(index) {
        if(index < 1) return;
        if(index > this.commits.length) return;

        this.commitIndex = index;
        let i = this.commitIndex - 1;
        this.storeStates = this.commits[i].commitState;
        this.goToState(this.commits[i].index);
    }

    getSavedValues() {
        let states = window.localStorage.getItem("Fluxtuate.savedStates");
        if(!states){
            return [];
        }else{
            return JSON.parse(states, dateParser);
        }
    }

    loadSavedValue(name) {
        let states = this.getSavedValues();
        let index = findIndex(states, {name});
        if(index === -1){
            throw new Error("Trying to load a non-existing state");
        }

        let state = states[index];

        this.selectedDiskState = state.name;
        this.storeStates = state.storeStates;
        this.commits = state.commits;
        this.commitIndex = state.commitIndex;
        this.goToState(state.stateIndex);
    }

    saveToDisk(name) {
        let states = this.getSavedValues();
        let index = findIndex(states, {name});
        if(index !== -1){
            throw new Error("State already exists in disk, you must choose a unique name!!");
        }
        this.addStateToDisk({
            name: name,
            storeStates: this.storeStates,
            commits: this.commits,
            stateIndex: this.stateIndex,
            commitIndex: this.commitIndex
        });
    }

    addStateToDisk(state) {
        if(!isString(state.name) ||
            !isArray(state.storeStates) ||
            !isArray(state.commits) ||
            !isNumber(state.stateIndex) ||
                !isNumber(state.commitIndex)
            )  {
            throw new Error(`Trying to add a invalid state: ${JSON.stringify(state)}`);
        }

        let states = this.getSavedValues();
        let nameId = 1;
        let originalName = state.name;
        while(findIndex(states, {name: state.name}) !== -1){
            state.name = originalName + " (" + nameId + ")";
            nameId ++ ;
        }
        states.push(state);
        window.localStorage.setItem("Fluxtuate.savedStates", JSON.stringify(states));
        this.setProps({
            savedValues: states
        });
    }

    deleteFromDisk(name) {
        let states = this.getSavedValues();
        let index = findIndex(states, {name});
        if(index !== -1) {
            states.splice(index, 1);
            window.localStorage.setItem("Fluxtuate.savedStates", JSON.stringify(states));
            this.setProps({
                savedValues: states
            });
        }
    }

    goToPreviousState() {
        this.goToState(this.stateIndex - 1);
    }

    goToNextState() {
        this.goToState(this.stateIndex + 1);
    }
}