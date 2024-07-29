/*
 * Copyright © 2024 Kaleido, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package io.kaleido.kata;

import java.io.File;
import java.lang.reflect.InvocationTargetException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.UnixDomainSocketAddress;
import java.util.concurrent.ConcurrentHashMap;

import com.google.protobuf.InvalidProtocolBufferException;

import io.grpc.Context;
import io.grpc.Context.CancellableContext;
import io.grpc.ManagedChannel;
import io.grpc.netty.NettyChannelBuilder;
import io.grpc.stub.StreamObserver;
import io.netty.channel.Channel;
import io.netty.channel.MultithreadEventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioDomainSocketChannel;
import github.com.kaleido_io.paladin.kata.Kata;
import github.com.kaleido_io.paladin.kata.KataMessageServiceGrpc;
import github.com.kaleido_io.paladin.kata.Kata.ListenRequest;
import github.com.kaleido_io.paladin.kata.plugin.Plugin.LoadJavaProviderRequest;;

public class PluginLoader {
    private final MultithreadEventLoopGroup eventLoopGroup;
    private final Class<? extends Channel> channelBuilder;
    private String socketAddress;
    private ManagedChannel channel;
    private CancellableContext listenerContext;
    public final static String destinationName = "io.kaleido.kata.pluginLoader"; 

     public PluginLoader(String socketAddress, String destinationName) {
        this.socketAddress = socketAddress;
        this.eventLoopGroup = new NioEventLoopGroup();
        this.channelBuilder = NioDomainSocketChannel.class;
    }
    //Connects to the comms bus and listens for messages on the well known destination `io.kaleido.kata.pluginLoader`
     public void start() {
        System.out.println("start" + this.socketAddress);

        this.channel = NettyChannelBuilder.forAddress(UnixDomainSocketAddress.of(this.socketAddress))
                .eventLoopGroup(this.eventLoopGroup)
                .channelType(this.channelBuilder)
                .usePlaintext()
                .build();

        waitGRPCReady();

        KataMessageServiceGrpc.KataMessageServiceStub asyncStub = KataMessageServiceGrpc
                .newStub(this.channel);

        StreamObserver<Kata.Message> listener = new StreamObserver<>() {

            @Override
            public void onNext(Kata.Message message) {
                String typeURL = message.getBody().getTypeUrl();
                System.out.printf("Provider message in Java %s [%s]\n",
                message.getId(),
                        typeURL);
                int lastSlashIndex = typeURL.lastIndexOf("/");
                String typeName = typeURL;
                if (lastSlashIndex != -1) {
                    typeName = typeURL.substring(lastSlashIndex + 1);
                }
                if (typeName.equals(
                        "github.com.kaleido_io.paladin.kata.plugin.LoadJavaProviderRequest")) {
                            
                    try {
                        LoadJavaProviderRequest body = message.getBody().unpack(LoadJavaProviderRequest.class);
                        String jarPath = body.getJarPath();
                        String name = body.getProviderName();
                        String providerClassName = body.getProviderClassName();

                        System.out.println("Loading provider " + name + " from " + jarPath + " with class " + providerClassName);

                        ClassLoader currentClassLoader = Thread.currentThread().getContextClassLoader();
                        URLClassLoader jarClassLoader = new URLClassLoader(new URL[]{new File(jarPath).toURI().toURL()}, currentClassLoader);
                        Thread.currentThread().setContextClassLoader(jarClassLoader);
                        Class<?> providerClass = jarClassLoader.loadClass(providerClassName);
                        
                        providerClass.getMethod("BuildInfo").invoke(null);

                    } catch (InvalidProtocolBufferException e) {
                        e.printStackTrace();
                    } catch (ClassNotFoundException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (IllegalAccessException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (IllegalArgumentException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (InvocationTargetException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (NoSuchMethodException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (SecurityException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    } catch (MalformedURLException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void onError(Throwable e) {
                e.printStackTrace(System.err);
            }

            @Override
            public void onCompleted() {
                System.err.println("Response stream in Java shut down");
            }
        };

        System.out.println("listening");
        this.listenerContext = Context.current().withCancellation();
        this.listenerContext.run(() -> {
            asyncStub.listen(ListenRequest.newBuilder().setDestination(destinationName).build(), listener);
        });

        System.out.println("listener stopped");

    }

    private void waitGRPCReady() {
        boolean started = false;
        while (!started) {
            try {
                Thread.sleep(500);
                started = getStatus().getOk();
            } catch (Exception e) {
                e.printStackTrace(System.err);
                System.out.println("not yet started");
            }
        }
        System.out.println("gRPC server ready");
    }

    public Kata.StatusResponse getStatus() {
        KataMessageServiceGrpc.KataMessageServiceBlockingStub blockingStub = KataMessageServiceGrpc
                .newBlockingStub(channel);
        return blockingStub.status(Kata.StatusRequest.newBuilder().build());
    }

    
}
