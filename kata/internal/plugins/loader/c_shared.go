package loader

/*
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>

void callInitializeTransportProvider(void *handle, const char* socket, const char* listenerDestination) {
	printf("socket in C %s\n", socket);
	void (*InitializeTransportProvider)(char* socket, char* listenerDestination);

    *(void **) (&InitializeTransportProvider) = dlsym(handle, "InitializeTransportProvider");
    if (InitializeTransportProvider) {
        InitializeTransportProvider(socket, listenerDestination);
    } else {
	    printf("Failed to find InitializeTransportProvider\n");
	}
}

*/
import "C"
import (
	"context"
	"fmt"
	"unsafe"

	"github.com/hyperledger/firefly-common/pkg/log"
	"github.com/kaleido-io/paladin/kata/internal/commsbus"
)

// functions specific to loading plugins that are built as go plugin shared libraries
type cSharedLoader struct {
}

type cSharedProvider struct {
	handle unsafe.Pointer
}

// BuildInfo implements ProviderBinding.
func (c *cSharedProvider) BuildInfo(ctx context.Context) (string, error) {
	return "BuildInfo not supported for C shared libraries", nil
}

// InitializeTransportProvider implements ProviderBinding.
func (c *cSharedProvider) InitializeTransportProvider(ctx context.Context, socketAddress string, providerListenerDestination string) error {

	// Call the LoadDomain function
	log.L(ctx).Info("calling callInitializeTransportProvider")
	cSocket := C.CString(socketAddress)
	defer C.free(unsafe.Pointer(cSocket))

	cListenerDestination := C.CString(providerListenerDestination)
	defer C.free(unsafe.Pointer(cListenerDestination))

	C.callInitializeTransportProvider(c.handle, cSocket, cListenerDestination)
	log.L(ctx).Info("called callInitializeTransportProvider")

	return nil
}

func (_ *cSharedLoader) Load(ctx context.Context, providerConfig Config, commsBus commsbus.CommsBus) (ProviderBinding, error) {
	log.L(ctx).Info("cSharedLoader.Load")
	path := "/Users/johnhosie/foo/paladin/paladin/kata/transportB.so"
	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))

	// Open the shared library
	handle := C.dlopen(cPath, C.RTLD_LAZY)
	if handle == nil {
		return nil, fmt.Errorf("failed to open library: %s", path)
	}
	//defer C.dlclose(handle)

	return &cSharedProvider{
		handle: handle,
	}, nil
}
