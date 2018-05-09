import Venom from './venom';

export default class AlgorithmFactory {
	static getProcessor(key) {
		switch (key) {
			case 'venom':
				return Venom;
		}
		return Venom;
	}
}
