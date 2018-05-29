import SimulatorTraderProvider from './simulatorTraderProvider';

export default class DispatchSimulatorTraderProvider extends SimulatorTraderProvider {

    async dispatch(message, log) {

        // Dispatch to external platform for execution.
        return false;
    }

}